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

describe("selectable branches", () => {
  const nodes = [
    { id: "hkcu", label: "HKEY_CURRENT_USER", children: [{ id: "env", label: "Environment" }, { id: "soft", label: "Software", children: [{ id: "app", label: "App" }] }] },
  ];
  const row = (view: ReturnType<typeof render>, id: string) =>
    view.container.querySelector<HTMLElement>(`[data-row-id="${id}"]`)!;

  it("a click or Enter selects a branch; the chevron, arrows and a double-click open and close it", () => {
    const onSelectedIdChange = vi.fn();
    const onExpandedChange = vi.fn();
    const view = render(<Tree nodes={nodes} aria-label="Keys" selectableGroups onSelectedIdChange={onSelectedIdChange} onExpandedChange={onExpandedChange} />);
    const tree = view.getByRole("tree");
    fireEvent.click(row(view, "hkcu"));
    expect(onSelectedIdChange).toHaveBeenLastCalledWith("hkcu", expect.objectContaining({ item: nodes[0] }));
    expect(row(view, "hkcu")).toHaveAttribute("aria-selected", "true");
    expect(row(view, "hkcu")).toHaveAttribute("aria-expanded", "false");
    expect(onExpandedChange).not.toHaveBeenCalled();
    // The chevron only toggles.
    fireEvent.click(row(view, "hkcu").querySelector(".fa-tree-chevron")!);
    expect(row(view, "hkcu")).toHaveAttribute("aria-expanded", "true");
    expect(onSelectedIdChange).toHaveBeenCalledTimes(1);
    // → and ← only open and close; Enter selects.
    fireEvent.focus(row(view, "soft"));
    fireEvent.keyDown(tree, { key: "ArrowRight" });
    expect(row(view, "app")).not.toBeNull();
    fireEvent.keyDown(tree, { key: "ArrowLeft" });
    expect(row(view, "app")).toBeNull();
    fireEvent.keyDown(tree, { key: "Enter" });
    expect(onSelectedIdChange).toHaveBeenLastCalledWith("soft", expect.anything());
    expect(row(view, "soft")).toHaveAttribute("aria-expanded", "false");
    // A double-click opens it.
    fireEvent.doubleClick(row(view, "soft"));
    expect(row(view, "soft")).toHaveAttribute("aria-expanded", "true");
  });

  it("without selectableGroups a branch toggles as before; per node with selectable", () => {
    const onSelectedIdChange = vi.fn();
    const view = render(<Tree nodes={nodes} aria-label="Keys" onSelectedIdChange={onSelectedIdChange} />);
    fireEvent.click(row(view, "hkcu"));
    expect(row(view, "hkcu")).toHaveAttribute("aria-expanded", "true");
    expect(row(view, "hkcu")).not.toHaveAttribute("aria-selected");
    expect(onSelectedIdChange).not.toHaveBeenCalled();
    const marked = [{ ...nodes[0]!, selectable: true }];
    view.rerender(<Tree nodes={marked} aria-label="Keys" onSelectedIdChange={onSelectedIdChange} />);
    fireEvent.click(row(view, "hkcu"));
    expect(onSelectedIdChange).toHaveBeenCalledWith("hkcu", expect.anything());
  });
});

describe("lazy children", () => {
  const row = (view: ReturnType<typeof render>, id: string) =>
    view.container.querySelector<HTMLElement>(`[data-row-id="${id}"]`);
  const status = (view: ReturnType<typeof render>) =>
    [...view.container.querySelectorAll<HTMLElement>("[data-status]")].map((element) => element.dataset.status);

  it("loads a branch's children on first expand, with a loading row, then shows them", async () => {
    let resolve!: () => void;
    const onLoadChildren = vi.fn(() => new Promise<void>((done) => (resolve = done)));
    const nodes = [{ id: "hklm", label: "HKEY_LOCAL_MACHINE", hasChildren: true }];
    const view = render(<Tree nodes={nodes} aria-label="Keys" onLoadChildren={onLoadChildren} />);
    expect(row(view, "hklm")!.querySelector(".fa-tree-chevron svg")).not.toBeNull();
    fireEvent.click(row(view, "hklm")!);
    expect(onLoadChildren).toHaveBeenCalledWith(nodes[0]);
    expect(status(view)).toEqual(["loading"]);
    expect(row(view, "hklm")).toHaveAttribute("aria-busy", "true");
    view.rerender(<Tree nodes={[{ ...nodes[0]!, children: [{ id: "sys", label: "SYSTEM" }] }]} aria-label="Keys" onLoadChildren={onLoadChildren} />);
    await act(async () => resolve());
    expect(status(view)).toEqual([]);
    expect(row(view, "sys")).not.toBeNull();
    // Closing and opening again does not load again.
    fireEvent.click(row(view, "hklm")!);
    fireEvent.click(row(view, "hklm")!);
    expect(onLoadChildren).toHaveBeenCalledTimes(1);
  });

  it("a failed load shows an error row whose Retry loads again", async () => {
    const onLoadChildren = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    const nodes = [{ id: "hklm", label: "HKEY_LOCAL_MACHINE", hasChildren: true }];
    const view = render(<Tree nodes={nodes} aria-label="Keys" defaultExpanded={["hklm"]} onLoadChildren={onLoadChildren} />);
    await act(async () => {});
    expect(status(view)).toEqual(["error"]);
    expect(view.getByRole("treeitem", { name: "Couldn't load · Retry" })).toBeInTheDocument();
    await act(async () => fireEvent.click(view.container.querySelector('[data-status="error"]')!));
    expect(onLoadChildren).toHaveBeenCalledTimes(2);
    // It resolved without giving the branch children: it has none, and loses its chevron.
    expect(status(view)).toEqual([]);
    expect(row(view, "hklm")!.querySelector(".fa-tree-chevron svg")).toBeNull();
    expect(row(view, "hklm")).not.toHaveAttribute("aria-expanded");
    expect(row(view, "hklm")).toHaveAttribute("data-kind", "group");
  });

  it("pages children with a Load more row", async () => {
    let finish!: () => void;
    const onLoadMore = vi.fn(() => new Promise<void>((done) => (finish = done)));
    const page = (count: number, more: boolean) => [{ id: "k", label: "Key", children: Array.from({ length: count }, (_, index) => ({ id: `k${index}`, label: `Sub ${index}` })), hasMore: more }];
    const view = render(<Tree nodes={page(2, true)} aria-label="Keys" defaultExpanded={["k"]} onLoadMore={onLoadMore} />);
    expect(status(view)).toEqual(["more"]);
    const more = view.container.querySelector<HTMLElement>('[data-status="more"]')!;
    expect(more).toHaveAttribute("aria-posinset", "3");
    fireEvent.focus(more);
    fireEvent.keyDown(view.getByRole("tree"), { key: "Enter" });
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(status(view)).toEqual(["more-loading"]);
    view.rerender(<Tree nodes={page(4, false)} aria-label="Keys" defaultExpanded={["k"]} onLoadMore={onLoadMore} />);
    await act(async () => finish());
    expect(status(view)).toEqual([]);
    expect(row(view, "k3")).not.toBeNull();
  });
});
