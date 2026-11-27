// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineActions } from "../actions/index.js";
import { EntityIdentity } from "./index.js";

interface Sample {
  id: string;
}
const SAMPLE: Sample = { id: "S-1" };
const open = vi.fn();
const actions = defineActions<Sample>("sample", [{ id: "rename", label: "Rename", group: "organise", run: () => undefined }]);

beforeEach(() => {
  open.mockReset();
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("EntityIdentity removable chip", () => {
  const removeButton = () => screen.getByRole("button", { name: /Remove Sample/ });

  it("keeps its link, with the ✕ beside it rather than inside", () => {
    const remove = vi.fn();
    render(<EntityIdentity tier="chip" name="Sample" href="/samples/1" preview={false} onRemove={remove} />);
    const link = screen.getByRole("link", { name: /Sample/ });
    expect(link.getAttribute("href")).toBe("/samples/1");
    expect(link.contains(removeButton())).toBe(false);
    fireEvent.click(removeButton());
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("opens from the name and not from the ✕", () => {
    const remove = vi.fn();
    render(<EntityIdentity tier="chip" name="Sample" onOpen={open} preview={false} onRemove={remove} />);
    const opener = screen.getByRole("button", { name: "Sample" });
    expect(opener.contains(removeButton())).toBe(false);
    fireEvent.click(removeButton());
    expect(open).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(1);
    fireEvent.click(opener);
    fireEvent.keyDown(opener, { key: "Enter" });
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("raises its actions on a right-click of the name and not of the ✕", async () => {
    render(<EntityIdentity tier="chip" name="Sample" actions={actions} target={SAMPLE} preview={false} onRemove={() => {}} />);
    fireEvent.contextMenu(removeButton());
    expect(screen.queryByRole("menuitem", { name: "Rename" })).toBeNull();
    fireEvent.contextMenu(screen.getByText("Sample"));
    expect(await screen.findByRole("menuitem", { name: "Rename" })).toBeTruthy();
  });

  it("is focusable for its actions when it has nowhere to go", () => {
    render(<EntityIdentity tier="chip" name="Sample" actions={actions} target={SAMPLE} preview={false} onRemove={() => {}} />);
    expect(document.querySelector(".fa-entity-chip-main")?.getAttribute("tabindex")).toBe("0");
  });

  it("stays a plain label and ✕ with nothing to open", () => {
    render(<EntityIdentity tier="chip" name="Sample" preview={false} onRemove={() => {}} />);
    expect(document.querySelector(".fa-entity-chip-main")).toBeNull();
    expect(screen.getByRole("group", { name: "Sample" }).contains(removeButton())).toBe(true);
  });
});

describe("EntityIdentity tags (#39)", () => {
  const state = { id: "no-agent", label: "No agent", tone: "warning" as const };
  it("draws tags before the state on the header and compact title lines, at the state's size", () => {
    for (const [tier, size] of [["header", "md"], ["compact", "sm"]] as const) {
      const { container, unmount } = render(
        <EntityIdentity tier={tier} name="EDGE-RT1" kind="Device" state={state} tags={["Router", { label: "Signed in", tone: "info" }]} />,
      );
      const line = container.querySelector(".fa-entity-state")!;
      expect([...line.children].map((badge) => badge.textContent)).toEqual(["Router", "Signed in", "No agent"]);
      expect([...line.children].map((badge) => badge.getAttribute("data-size") ?? size)).toEqual([size, size, size]);
      expect(line.querySelector(".fa-entity-tag")).toHaveAttribute("data-tone", "neutral");
      unmount();
    }
  });

  it("shows tags without a state, and leaves them out of rows", () => {
    const { container, unmount } = render(<EntityIdentity tier="compact" name="EDGE-RT1" tags={["Router"]} />);
    expect(container.querySelector(".fa-entity-state")).toHaveTextContent("Router");
    unmount();
    render(<EntityIdentity tier="row" name="EDGE-RT1" tags={["Router"]} />);
    expect(screen.queryByText("Router")).toBeNull();
  });

  it("lets a state slot reuse the library's state badge", () => {
    const { container } = render(
      <EntityIdentity tier="compact" name="EDGE-RT1" slots={{ state: <EntityIdentity.State state={state} size="sm" /> }} />,
    );
    expect(container.querySelector(".fa-entity-state .fa-entity-badge")).toHaveTextContent("No agent");
  });
});
