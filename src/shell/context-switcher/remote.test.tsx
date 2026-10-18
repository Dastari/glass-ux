// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { TooltipProvider } from "../../ui/tooltip/index.js";
import { ContextSwitcher, ContextSwitcherPanel } from "./context-switcher.js";
import { DEFAULT_SWITCHER_LABELS, type ContextItem } from "./model.js";
import { remoteGroups, type ContextSwitcherRemote } from "./remote.js";

vi.mock("../../lib/use-media-query.js", () => ({ useMediaQuery: () => false }));
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());
const rows: ContextItem[] = [
  { id: "z", name: "Zinnia Workshop", parentId: "a" },
  { id: "a", name: "Acorn Guild" },
];
const remote = (
  changes: Partial<ContextSwitcherRemote> = {},
): ContextSwitcherRemote => ({
  query: "server-only alias",
  onQueryChange: vi.fn(),
  loading: false,
  hasNextPage: false,
  onLoadMore: vi.fn(),
  ...changes,
});

describe("bounded organisation directory", () => {
  it("preserves server matches/order without inferring hierarchy, ranking or recents", () => {
    const groups = remoteGroups(rows, remote(), DEFAULT_SWITCHER_LABELS);
    expect(
      groups[1]!.items.map((item) => [
        item.value,
        item.depth,
        item.includes,
        item.detail,
      ]),
    ).toEqual([
      ["z", 0, 0, undefined],
      ["a", 0, 0, undefined],
    ]);
    expect(groups[0]!.items[0]).toMatchObject({
      value: null,
      label: "All organisations",
    });
  });
  it.each([{ loading: true }, { error: "Read denied" }])(
    "hides stale options during %j while keeping All explicit",
    (state) => {
      expect(
        remoteGroups(rows, remote(state), DEFAULT_SWITCHER_LABELS)
          .flatMap((group) => group.items)
          .map((row) => row.value),
      ).toEqual([null]);
    },
  );
  it("retains an authoritative selected identity outside the loaded page without descendants", () => {
    render(
      <TooltipProvider>
        <ContextSwitcher
          items={rows}
          value="elsewhere"
          onValueChange={vi.fn()}
          remote={remote({
            selected: { id: "elsewhere", name: "Harbour Works", parentId: "a" },
          })}
        />
      </TooltipProvider>,
    );
    expect(
      screen.getByLabelText("Organisation: Harbour Works"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/and .* under it/)).not.toBeInTheDocument();
  });
  it("never presents an unresolved or mismatched selected identity as All", () => {
    const view = render(
      <TooltipProvider>
        <ContextSwitcher
          items={[]}
          value="private"
          onValueChange={vi.fn()}
          remote={remote({
            selected: { id: "other", name: "Different customer" },
          })}
        />
      </TooltipProvider>,
    );
    expect(
      screen.getByLabelText("Organisation: Organisation unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Organisation: All organisations"),
    ).not.toBeInTheDocument();
    view.rerender(
      <TooltipProvider>
        <ContextSwitcher
          items={[]}
          value={null}
          onValueChange={vi.fn()}
          remote={remote()}
        />
      </TooltipProvider>,
    );
    expect(
      screen.getByLabelText("Organisation: All organisations"),
    ).toBeInTheDocument();
  });
  it("exposes controlled search and continuation without filtering the bounded server response", () => {
    const source = remote({ hasNextPage: true });
    render(
      <TooltipProvider>
        <ContextSwitcherPanel
          items={rows}
          value={null}
          onValueChange={vi.fn()}
          remote={source}
        />
      </TooltipProvider>,
    );
    expect(
      screen.getByRole("option", { name: "Zinnia Workshop" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search organisations"), {
      target: { value: "coastal" },
    });
    expect(source.onQueryChange).toHaveBeenCalledWith("coastal");
    fireEvent.click(
      screen.getByRole("button", { name: "Load more organisations" }),
    );
    expect(source.onLoadMore).toHaveBeenCalledOnce();
  });
  it("shows errors and retry, blocks continuation, and distinguishes a successful empty result", () => {
    const source = remote({
      error: "Directory read denied",
      hasNextPage: true,
      onRetry: vi.fn(),
    });
    const view = render(
      <TooltipProvider>
        <ContextSwitcherPanel
          items={rows}
          value={null}
          onValueChange={vi.fn()}
          remote={source}
        />
      </TooltipProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Directory read denied",
    );
    expect(
      screen.queryByRole("option", { name: "Zinnia Workshop" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Load more organisations" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(source.onRetry).toHaveBeenCalledOnce();
    view.rerender(
      <TooltipProvider>
        <ContextSwitcherPanel
          items={[]}
          value={null}
          onValueChange={vi.fn()}
          remote={remote({ query: "no match" })}
        />
      </TooltipProvider>,
    );
    expect(
      screen.getByText("No organisations match “no match”"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "All organisations" }),
    ).toBeInTheDocument();
  });
});
