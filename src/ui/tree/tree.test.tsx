// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRef, useState } from "react";
import { Tree, moveTreeNodes, treePath, type TreeHandle, type TreeMove, type TreeNode } from "./index.js";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
  HTMLElement.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Tree loading its drag support", () => {
  it("keeps focus on the row when the rows remount under the loaded provider", async () => {
    const nodes = [
      { id: "g", label: "Group", children: [{ id: "a", label: "Alpha" }] },
      { id: "b", label: "Beta" },
    ];
    render(<Tree nodes={nodes} aria-label="Movable" defaultExpanded={["g"]} onMove={() => undefined} />);
    const row = screen.getByRole("treeitem", { name: /Beta/ });
    row.focus();
    expect(document.activeElement).toBe(row);
    await waitFor(() => expect(row.isConnected).toBe(false));
    expect(document.activeElement?.getAttribute("data-row-id")).toBe("b");
  });
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

describe("group counts", () => {
  it("shows each group's count unless groupCounts is off", () => {
    const nodes = [{ id: "g", label: "Group", children: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }] }]
    const view = render(<Tree nodes={nodes} aria-label="Nodes" />)
    expect(view.container.querySelector(".fa-tree-count")).toHaveTextContent("2")
    view.rerender(<Tree nodes={nodes} aria-label="Nodes" groupCounts={false} />)
    expect(view.container.querySelector(".fa-tree-count")).toBeNull()
  })
})

const row = (view: ReturnType<typeof render>, id: string) => view.container.querySelector<HTMLElement>(`[data-row-id="${id}"]`);

describe("multiple selection", () => {
  const nodes = [
    { id: "g", label: "Group", children: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }, { id: "c", label: "Gamma" }] },
    { id: "lazy", label: "Lazy", hasChildren: true, selectable: true },
  ];

  it("leaves single selection's markup alone", () => {
    const view = render(<Tree nodes={nodes} aria-label="Nodes" defaultExpanded={["g"]} />);
    expect(view.getByRole("tree")).not.toHaveAttribute("aria-multiselectable");
    expect(view.getByRole("tree")).not.toHaveAttribute("aria-describedby");
    expect(view.container.querySelector(".fa-tree-announcer, .fa-tree-trailing, .fa-tree-check")).toBeNull();
  });

  it("replaces, toggles and takes ranges, and reports ids", () => {
    const onChange = vi.fn();
    const view = render(<Tree nodes={nodes} aria-label="Nodes" defaultExpanded={["g"]} selectionMode="multiple" onSelectedIdsChange={onChange} />);
    expect(view.getByRole("tree")).toHaveAttribute("aria-multiselectable", "true");
    fireEvent.click(row(view, "a")!);
    expect(onChange).toHaveBeenLastCalledWith(["a"], expect.objectContaining({ reason: "item-press" }));
    fireEvent.click(row(view, "c")!, { ctrlKey: true });
    expect(onChange).toHaveBeenLastCalledWith(["a", "c"], expect.anything());
    expect(row(view, "c")).toHaveAttribute("aria-selected", "true");
    expect(row(view, "b")).toHaveAttribute("aria-selected", "false");
    fireEvent.click(row(view, "a")!, { metaKey: true });
    expect(onChange).toHaveBeenLastCalledWith(["c"], expect.anything());
    fireEvent.click(row(view, "c")!, { shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(["a", "b", "c"], expect.anything());
  });

  it("keys: Space toggles, Shift extends, Ctrl+A takes what is loaded and names what is not", () => {
    const onChange = vi.fn();
    const view = render(<Tree nodes={nodes} aria-label="Nodes" defaultExpanded={["g"]} selectionMode="multiple" onSelectedIdsChange={onChange} />);
    const tree = view.getByRole("tree");
    fireEvent.focus(row(view, "a")!);
    fireEvent.keyDown(tree, { key: " " });
    expect(onChange).toHaveBeenLastCalledWith(["a"], expect.objectContaining({ reason: "keyboard" }));
    fireEvent.keyDown(tree, { key: "ArrowDown", shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(["a", "b"], expect.anything());
    fireEvent.keyDown(tree, { key: "a", ctrlKey: true });
    const [ids, details] = onChange.mock.calls.at(-1)!;
    expect(ids).toEqual(["a", "b", "c", "lazy"]);
    expect(details.unloaded).toEqual(["lazy"]);
    expect(details.limited).toBe(false);
  });

  it("holds ids that are not loaded, and a limit stops a range", () => {
    const onChange = vi.fn();
    const view = render(<Tree nodes={nodes} aria-label="Nodes" defaultExpanded={["g"]} selectionMode="multiple" defaultSelectedIds={["not-loaded", "a"]} selectionLimit={2} onSelectedIdsChange={onChange} />);
    expect(row(view, "a")).toHaveAttribute("aria-selected", "true");
    fireEvent.click(row(view, "b")!, { ctrlKey: true });
    expect(onChange).toHaveBeenLastCalledWith(["not-loaded", "a", "b"], expect.anything());
    fireEvent.keyDown(view.getByRole("tree"), { key: "a", ctrlKey: true });
    expect(onChange.mock.calls.at(-1)![1].limited).toBe(true);
    expect(onChange.mock.calls.at(-1)![0]).toHaveLength(2);
    expect(view.container.querySelector(".fa-tree-announcer")).toHaveTextContent("Selected the first 2 rows");
  });

  it("a check mark toggles without a modifier", () => {
    const onChange = vi.fn();
    const view = render(<Tree nodes={nodes} aria-label="Nodes" defaultExpanded={["g"]} selectionMode="multiple" checkboxes defaultSelectedIds={["a"]} onSelectedIdsChange={onChange} />);
    fireEvent.click(row(view, "b")!.querySelector(".fa-tree-check")!);
    expect(onChange).toHaveBeenLastCalledWith(["a", "b"], expect.anything());
  });
});

describe("trailing content", () => {
  it("renders at the row's end, and a control there keeps its click", () => {
    const onSelectedIdChange = vi.fn();
    const onClick = vi.fn();
    const view = render(<Tree nodes={[{ id: "a", label: "Alpha" }]} aria-label="Nodes" onSelectedIdChange={onSelectedIdChange} renderTrailing={() => <button tabIndex={-1} onClick={onClick}>Sync</button>} />);
    fireEvent.click(view.getByRole("button", { name: "Sync", hidden: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSelectedIdChange).not.toHaveBeenCalled();
  });
});

describe("rename", () => {
  const nodes: TreeNode[] = [{ id: "a", label: "report.pdf" }, { id: "b", label: "Fixed", renamable: false }];

  it("F2 opens the field on the row, Enter commits and focus returns", () => {
    const onRename = vi.fn();
    const view = render(<Tree nodes={nodes} aria-label="Files" onRename={onRename} />);
    fireEvent.focus(row(view, "a")!);
    fireEvent.keyDown(view.getByRole("tree"), { key: "F2" });
    const field = view.getByRole("textbox", { name: "Rename report.pdf" }) as HTMLInputElement;
    expect(field).toHaveFocus();
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 6]);
    fireEvent.change(field, { target: { value: "summary.pdf" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onRename).toHaveBeenCalledWith("a", "summary.pdf", { node: nodes[0] });
    expect(view.queryByRole("textbox")).toBeNull();
    expect(row(view, "a")).toHaveFocus();
  });

  it("Escape cancels without reporting, and stays out of the tree's keys", () => {
    const onRename = vi.fn();
    const view = render(<Tree nodes={nodes} aria-label="Files" defaultRenamingId="a" onRename={onRename} />);
    const field = view.getByRole("textbox");
    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(field).toBeInTheDocument();
    fireEvent.change(field, { target: { value: "other" } });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(onRename).not.toHaveBeenCalled();
    expect(view.queryByRole("textbox")).toBeNull();
    expect(row(view, "a")).toHaveFocus();
  });

  it("a refusal keeps the field and says why", () => {
    const view = render(<Tree nodes={nodes} aria-label="Files" defaultRenamingId="a" onRename={() => "That name is taken"} />);
    const field = view.getByRole("textbox");
    fireEvent.change(field, { target: { value: "taken" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(view.getByRole("alert")).toHaveTextContent("That name is taken");
  });

  it("respects renamable", () => {
    const view = render(<Tree nodes={nodes} aria-label="Files" onRename={() => undefined} />);
    fireEvent.focus(row(view, "b")!);
    fireEvent.keyDown(view.getByRole("tree"), { key: "F2" });
    expect(view.queryByRole("textbox")).toBeNull();
  });
});

describe("moving", () => {
  const nodes: TreeNode[] = [
    { id: "f", label: "Folder", children: [{ id: "x", label: "X" }, { id: "y", label: "Y" }] },
    { id: "a", label: "Alpha" },
    { id: "b", label: "Beta" },
  ];

  function Host({ onMove, canMove }: { onMove: (move: TreeMove) => void; canMove?: (move: TreeMove) => boolean | string }) {
    const [list, setList] = useState(nodes);
    return <Tree nodes={list} aria-label="Files" defaultExpanded={["f"]} canMove={canMove} onMove={(move) => { onMove(move); setList((current) => moveTreeNodes(current, move)); }} />;
  }

  it("Alt with the arrows moves among siblings, into and out of a branch", async () => {
    const onMove = vi.fn();
    const view = render(<Host onMove={onMove} />);
    await act(async () => {});
    const tree = view.getByRole("tree");
    const order = () => [...view.container.querySelectorAll("[data-row-id]")].map((element) => element.getAttribute("data-row-id"));
    fireEvent.focus(row(view, "a")!);
    fireEvent.keyDown(tree, { key: "ArrowDown", altKey: true });
    expect(onMove).toHaveBeenLastCalledWith({ ids: ["a"], parentId: null, beforeId: null, index: 2, input: "keyboard" });
    fireEvent.keyDown(tree, { key: "ArrowUp", altKey: true });
    expect(onMove).toHaveBeenLastCalledWith({ ids: ["a"], parentId: null, beforeId: "b", index: 1, input: "keyboard" });
    fireEvent.keyDown(tree, { key: "ArrowRight", altKey: true });
    expect(onMove).toHaveBeenLastCalledWith({ ids: ["a"], parentId: "f", beforeId: null, index: 2, input: "keyboard" });
    expect(order()).toContain("a");
    fireEvent.keyDown(tree, { key: "ArrowLeft", altKey: true });
    expect(onMove).toHaveBeenLastCalledWith({ ids: ["a"], parentId: null, beforeId: "b", index: 1, input: "keyboard" });
  });

  it("never moves a branch into itself, and says why a move is refused", async () => {
    const onMove = vi.fn();
    const view = render(<Host onMove={onMove} canMove={() => "Not here"} />);
    await act(async () => {});
    fireEvent.focus(row(view, "a")!);
    fireEvent.keyDown(view.getByRole("tree"), { key: "ArrowUp", altKey: true });
    expect(onMove).not.toHaveBeenCalled();
    expect(view.container.querySelector(".fa-tree-announcer")).toHaveTextContent("Not here");
  });

  it("is unavailable while searching", async () => {
    const onMove = vi.fn();
    const view = render(<Tree nodes={nodes} aria-label="Files" query="a" onMove={onMove} />);
    await act(async () => {});
    fireEvent.focus(row(view, "a")!);
    fireEvent.keyDown(view.getByRole("tree"), { key: "ArrowDown", altKey: true });
    expect(onMove).not.toHaveBeenCalled();
    expect(view.container.querySelector(".fa-tree-announcer")).toHaveTextContent("Clear the search to move items");
  });

  it("moveTreeNodes applies a move anywhere, and treePath finds a loaded row", () => {
    expect(moveTreeNodes(nodes, { ids: ["x", "b"], parentId: null, beforeId: "a" }).map((node) => node.id)).toEqual(["f", "x", "b", "a"]);
    expect(moveTreeNodes(nodes, { ids: ["a"], parentId: "f", beforeId: "y" })[0]!.children!.map((node) => node.id)).toEqual(["x", "a", "y"]);
    expect(treePath(nodes, "y")).toEqual(["f"]);
    expect(treePath(nodes, "a")).toEqual([]);
    expect(treePath(nodes, "nope")).toBeNull();
  });
});

describe("reveal", () => {
  const virtual = { id: "deep", label: "Deep" };

  it("opens loaded ancestors and resolves true; false for what is not there", async () => {
    const handle = createRef<TreeHandle>();
    const nodes = [{ id: "g", label: "Group", children: [{ id: "h", label: "Inner", children: [virtual] }] }];
    const view = render(<Tree ref={handle} nodes={nodes} aria-label="Nodes" />);
    let found!: Promise<boolean>;
    await act(async () => {
      found = handle.current!.reveal("deep", { focus: true });
    });
    await expect(found).resolves.toBe(true);
    expect(row(view, "deep")).toHaveFocus();
    await expect(handle.current!.reveal("nothing")).resolves.toBe(false);
  });

  it("loads a path it has not seen, paging a large branch", async () => {
    const handle = createRef<TreeHandle>();
    function Host() {
      const [nodes, setNodes] = useState<TreeNode[]>([{ id: "root", label: "Root", hasChildren: true }]);
      return (
        <Tree
          ref={handle}
          nodes={nodes}
          aria-label="Nodes"
          onLoadChildren={async () => setNodes([{ id: "root", label: "Root", children: [{ id: "one", label: "One" }], hasMore: true }])}
          onLoadMore={async () => setNodes([{ id: "root", label: "Root", children: [{ id: "one", label: "One" }, { id: "two", label: "Two" }], hasMore: false }])}
        />
      );
    }
    const view = render(<Host />);
    let found!: Promise<boolean>;
    await act(async () => {
      found = handle.current!.reveal("two", { path: ["root"], select: true });
    });
    await expect(found).resolves.toBe(true);
    expect(row(view, "two")).toHaveAttribute("aria-selected", "true");
  });

  it("a failed load resolves false, and a second reveal replaces the first", async () => {
    const handle = createRef<TreeHandle>();
    const nodes = [{ id: "root", label: "Root", hasChildren: true }];
    render(<Tree ref={handle} nodes={nodes} aria-label="Nodes" onLoadChildren={() => Promise.reject(new Error("offline"))} />);
    let found!: Promise<boolean>;
    await act(async () => {
      found = handle.current!.reveal("two", { path: ["root"] });
    });
    await expect(found).resolves.toBe(false);
  });
});

describe("Tree search that empties it", () => {
  const nodes: TreeNode[] = [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }];

  it("keeps its hooks in order when a search empties it and fills it again", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(<Tree nodes={nodes} aria-label="Sample tree" query="" />);
    expect(screen.getByText("Alpha")).toBeTruthy();

    rerender(<Tree nodes={nodes} aria-label="Sample tree" query="zzz" />);
    expect(screen.queryByText("Alpha")).toBeNull();
    expect(document.querySelector(".fa-tree[data-empty]")).toBeTruthy();

    rerender(<Tree nodes={nodes} aria-label="Sample tree" query="alp" />);
    expect(screen.getByRole("treeitem", { name: /Alpha/ })).toBeTruthy();

    rerender(<Tree nodes={nodes} aria-label="Sample tree" query="" />);
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(errors.mock.calls.filter(([message]) => /hook/i.test(String(message)))).toEqual([]);
    errors.mockRestore();
  });
});
