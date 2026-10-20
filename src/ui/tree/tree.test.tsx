// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tree } from "./tree.js";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("selection", () => {
  const nodes = [
    {
      id: "g",
      label: "Group",
      children: [
        { id: "a", label: "Alpha" },
        { id: "b", label: "Beta" },
      ],
    },
  ];
  const row = (view: ReturnType<typeof render>, id: string) =>
    view.container.querySelector<HTMLElement>(`[data-row-id="${id}"]`)!;

  it("selects an endpoint on its own when uncontrolled", () => {
    const onSelectedIdChange = vi.fn();
    const view = render(
      <Tree nodes={nodes} aria-label="Nodes" defaultExpanded={["g"]} defaultSelectedId="a" onSelectedIdChange={onSelectedIdChange} />,
    );
    expect(row(view, "a")).toHaveAttribute("aria-selected", "true");
    fireEvent.click(row(view, "b"));
    expect(row(view, "b")).toHaveAttribute("aria-selected", "true");
    expect(row(view, "a")).toHaveAttribute("aria-selected", "false");
    expect(onSelectedIdChange).toHaveBeenCalledTimes(1);
    const [id, details] = onSelectedIdChange.mock.calls[0]!;
    expect(id).toBe("b");
    expect(details.reason).toBe("item-press");
    expect(details.item).toBe(nodes[0]!.children[1]);
    expect(details.event).toBeInstanceOf(MouseEvent);
    // A group toggles and the selected endpoint reports nothing.
    fireEvent.click(row(view, "b"));
    fireEvent.click(row(view, "g"));
    expect(onSelectedIdChange).toHaveBeenCalledTimes(1);
  });

  it("follows selectedId when controlled, reports Enter with its key event and clears with null", () => {
    const onSelectedIdChange = vi.fn();
    const view = render(<Tree nodes={nodes} aria-label="Nodes" defaultExpanded={["g"]} selectedId="a" onSelectedIdChange={onSelectedIdChange} />);
    fireEvent.focus(row(view, "b"));
    fireEvent.keyDown(view.getByRole("tree"), { key: "Enter" });
    expect(onSelectedIdChange).toHaveBeenCalledWith("b", expect.objectContaining({ reason: "item-press", item: nodes[0]!.children[1] }));
    expect(onSelectedIdChange.mock.calls[0]![1].event).toBeInstanceOf(KeyboardEvent);
    // The parent has not accepted it yet.
    expect(row(view, "a")).toHaveAttribute("aria-selected", "true");
    expect(row(view, "b")).toHaveAttribute("aria-selected", "false");
    view.rerender(<Tree nodes={nodes} aria-label="Nodes" defaultExpanded={["g"]} selectedId={null} onSelectedIdChange={onSelectedIdChange} />);
    expect(view.container.querySelector('[aria-selected="true"]')).toBeNull();
  });
});

describe("large tree virtualization", () => {
  it("does not revisit every node on scroll and preserves changed node order", () => {
    let reads = 0;
    const nodes = Array.from({ length: 1000 }, (_, index) => ({
      get id() {
        reads++;
        return String(index);
      },
      label: `Node ${index}`,
    }));
    const view = render(<Tree nodes={nodes} aria-label="Nodes" />);
    const scroller = view.getByRole("tree");
    reads = 0;
    act(() => {
      scroller.scrollTop = 400;
      fireEvent.scroll(scroller);
    });
    expect(reads).toBeLessThan(500);
    expect(
      view.container.querySelectorAll("[data-row-id]").length,
    ).toBeLessThan(30);
    const reordered = [...nodes];
    [reordered[10], reordered[11]] = [reordered[11]!, reordered[10]!];
    view.rerender(<Tree nodes={reordered} aria-label="Nodes" />);
    // Probes have no CSS box in jsdom, so the fallback leaf height is 36px.
    expect(
      view.container.querySelector('[data-row-id="11"]')?.getAttribute("style"),
    ).toContain("360px");
  });
});
