// @vitest-environment jsdom
import { createRef } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { installGlassTestEnvironment } from "../../testing/environment.js";
import { VirtualList, type VirtualListHandle } from "./index.js";

let restore: () => void;
beforeAll(() => {
  restore = installGlassTestEnvironment();
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function () {
      return this.classList.contains("fa-virtual-list") ? 180 : 30;
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(500);
});
afterEach(cleanup);
afterAll(() => {
  vi.restoreAllMocks();
  restore();
});
const items = Array.from({ length: 1000 }, (_, i) => ({ id: `row-${i}` }));
const getKey = (item: (typeof items)[number]) => item.id;

it("windows rows and keeps the focused row mounted while scrolling", async () => {
  render(
    <VirtualList
      items={items}
      getKey={getKey}
      estimateSize={30}
      renderItem={(item) => <button>{item.id}</button>}
      aria-label="Rows"
    />,
  );
  const first = await screen.findByRole("button", { name: "row-0" });
  first.focus();
  const list = screen.getByRole("list");
  expect(screen.getAllByRole("listitem").length).toBeLessThan(25);
  list.scrollTop = 15000;
  fireEvent.scroll(list);
  await screen.findByRole("button", { name: "row-500" });
  expect(screen.getByRole("button", { name: "row-0" })).toBe(first);
  expect(first).toHaveFocus();
  fireEvent.blur(first, { relatedTarget: document.body });
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "row-0" })).toBeNull(),
  );
});

it("announces positions and supports listbox keyboard selection", async () => {
  const change = vi.fn();
  render(
    <VirtualList
      items={items}
      getKey={getKey}
      estimateSize={30}
      role="listbox"
      onSelectedKeyChange={change}
      renderItem={(item) => item.id}
    />,
  );
  const first = await screen.findByRole("option", { name: "row-0" });
  first.focus();
  expect(first).toHaveAttribute("aria-setsize", "1000");
  expect(first).toHaveAttribute("aria-posinset", "1");
  fireEvent.keyDown(first, { key: "ArrowDown" });
  const second = screen.getByRole("option", { name: "row-1" });
  await waitFor(() => expect(second).toHaveFocus());
  fireEvent.keyDown(second, { key: "Enter" });
  expect(change).toHaveBeenLastCalledWith("row-1");
  expect(second).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(second, { key: "End" });
  await waitFor(() =>
    expect(screen.getByRole("option", { name: "row-999" })).toHaveFocus(),
  );
});

it("calls end reached once per loaded end, pauses for loading and exposes scrolling", async () => {
  const reached = vi.fn(),
    ref = createRef<VirtualListHandle>();
  const props = {
    items: items.slice(0, 4),
    getKey,
    estimateSize: 30,
    renderItem: (item: (typeof items)[number]) => item.id,
    onEndReached: reached,
    ref,
  };
  const { rerender } = render(<VirtualList {...props} loading="Loading" />);
  expect(reached).not.toHaveBeenCalled();
  rerender(<VirtualList {...props} />);
  await waitFor(() => expect(reached).toHaveBeenCalledTimes(1));
  rerender(<VirtualList {...props} />);
  expect(reached).toHaveBeenCalledTimes(1);
  rerender(<VirtualList {...props} items={items.slice(0, 5)} />);
  await waitFor(() => expect(reached).toHaveBeenCalledTimes(2));
  const scroll = vi.spyOn(screen.getByRole("list"), "scrollTo");
  ref.current!.scrollToIndex(999);
  expect(scroll).toHaveBeenCalled();
});

it("renders empty and loading slots in the existing list box", () => {
  const { rerender } = render(
    <VirtualList
      items={[]}
      getKey={String}
      estimateSize={30}
      renderItem={String}
      empty="No records"
    />,
  );
  expect(screen.getByRole("list")).toHaveTextContent("No records");
  rerender(
    <VirtualList
      items={[]}
      getKey={String}
      estimateSize={30}
      renderItem={String}
      empty="No records"
      loading="Loading records"
    />,
  );
  expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true");
  expect(screen.queryByText("No records")).toBeNull();
});
