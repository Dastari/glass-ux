// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "../tooltip/index.js";
import { createDataTableColumns } from "./columns.js";
import { DataTable } from "./data-table.js";
import { exportTsv } from "./export.js";
import { filters } from "./filters/index.js";
import type { DataTableProps, DataTableState, DataTableTree } from "./types.js";

const dimensions = vi.hoisted(() => ({ width: 1200 }));
vi.mock("../../lib/use-element-size.js", () => ({
  useElementSize: () => ({ width: dimensions.width, height: 500 }),
}));
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = () => {};
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("fa-dt-scroll") ? 600 : this.classList.contains("fa-dt-probe") ? 40 : 0;
  });
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("fa-dt-scroll") ? 600 : 0;
  });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  dimensions.width = 1200;
});
afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface Item {
  id: string;
  name: string;
  children?: Item[];
  /** Children on the server. */
  count?: number;
}
const col = createDataTableColumns<Item>();
const columns = col.columns([
  col.accessor("name", { header: "Name", cardRole: "title" }),
  col.accessor("id", { header: "Reference", cardRole: "meta" }),
]);
const flat: Item[] = [
  { id: "a", name: "Alder" },
  { id: "b", name: "Birch" },
  { id: "c", name: "Cedar" },
];
const nested: Item[] = [
  {
    id: "p",
    name: "Parent",
    children: [
      { id: "p1", name: "First" },
      { id: "p2", name: "Second", children: [{ id: "p2x", name: "Deep" }] },
    ],
  },
  { id: "lazy", name: "Lazy", count: 2 },
  { id: "leaf", name: "Leaf" },
];

type TableProps = Partial<DataTableProps<Item>>;
function Table(props: TableProps) {
  return (
    <TooltipProvider>
      <DataTable<Item>
        id="row-expansion"
        label="Items"
        rows={flat}
        columns={columns}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.name}
        {...props}
      />
    </TooltipProvider>
  );
}
const rowOf = (id: string) => document.querySelector<HTMLElement>(`[data-item="row"][data-row-id="${id}"]`)!;
const ids = () => [...document.querySelectorAll<HTMLElement>("[data-item]")].map((line) => line.dataset.rowId ?? `${line.dataset.item}:${line.dataset.forRow}`);
const treeOf = (overrides: Partial<DataTableTree<Item>> = {}): DataTableTree<Item> => ({
  getSubRows: (row) => row.children,
  hasChildren: (row) => (row.count ?? 0) > 0,
  getChildCount: (row) => row.count,
  ...overrides,
});
const expander = (label: string) => screen.getByRole("button", { name: `Expand ${label}` });
const collapser = (label: string) => screen.getByRole("button", { name: `Collapse ${label}` });

describe("a table with neither", () => {
  it("stays a plain grid with no expanders, levels or extra state", () => {
    const onStateChange = vi.fn();
    render(<Table onStateChange={onStateChange} />);
    expect(screen.getByRole("grid")).toHaveProperty("tagName", "DIV");
    expect(document.querySelector(".fa-dt-expander")).toBeNull();
    expect(document.querySelector("[aria-level]")).toBeNull();
    expect(screen.getByRole("grid").getAttribute("aria-rowcount")).toBe("4");
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Alder" }));
    const [state, change, details] = onStateChange.mock.calls[0]!;
    expect(change).toBe("selection");
    expect(state).not.toHaveProperty("expanded");
    expect(details).toBeUndefined();
    expect(onStateChange.mock.calls[0]).toHaveLength(2);
  });
});

describe("detail panels", () => {
  it("renders a panel only once it opens, under its row", () => {
    const renderRowDetail = vi.fn((row: Item) => <p>Panel for {row.name}</p>);
    render(<Table renderRowDetail={renderRowDetail} />);
    expect(renderRowDetail).not.toHaveBeenCalled();
    fireEvent.click(expander("Birch"));
    expect(renderRowDetail).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Panel for Birch")).toBeTruthy();
    expect(ids()).toEqual(["a", "b", "detail:b", "c"]);
    fireEvent.click(collapser("Birch"));
    expect(screen.queryByText("Panel for Birch")).toBeNull();
  });

  it("keeps grid semantics: the button holds the state and names the panel", () => {
    render(<Table renderRowDetail={(row) => row.name} defaultState={{ expanded: ["a"] }} />);
    expect(screen.getByRole("grid")).toBeTruthy();
    expect(screen.queryByRole("treegrid")).toBeNull();
    expect(rowOf("a").hasAttribute("aria-expanded")).toBe(false);
    expect(rowOf("a").hasAttribute("aria-level")).toBe(false);
    const button = collapser("Alder");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const panel = document.getElementById(button.getAttribute("aria-controls")!)!;
    expect(panel.getAttribute("role")).toBe("gridcell");
    expect(panel.textContent).toContain("Details for Alder");
    expect(panel.getAttribute("aria-colspan")).toBe(screen.getByRole("grid").getAttribute("aria-colcount"));
  });

  it("works uncontrolled and reports each change", () => {
    const onStateChange = vi.fn();
    render(<Table renderRowDetail={(row) => row.name} defaultState={{ expanded: ["a"] }} onStateChange={onStateChange} />);
    fireEvent.click(expander("Cedar"));
    expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ expanded: ["a", "c"] }), "expanded");
    fireEvent.click(collapser("Alder"));
    expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ expanded: ["c"] }), "expanded");
  });

  it("follows controlled ids", () => {
    const { rerender } = render(<Table renderRowDetail={(row) => row.name} state={{ expanded: ["a"] }} />);
    expect(ids()).toContain("detail:a");
    fireEvent.click(expander("Birch"));
    // The host did not take the change.
    expect(ids()).not.toContain("detail:b");
    rerender(<Table renderRowDetail={(row) => row.name} state={{ expanded: ["b"] }} />);
    expect(ids()).toEqual(["a", "b", "detail:b", "c"]);
  });

  it("offers no expander on a row without a panel, and keeps its space", () => {
    render(<Table renderRowDetail={(row) => row.name} canExpandRow={(row) => row.id !== "b"} defaultState={{ expanded: ["b"] }} />);
    expect(screen.queryByRole("button", { name: "Expand Birch" })).toBeNull();
    expect(rowOf("b").querySelector(".fa-dt-expander[data-spacer]")).toBeTruthy();
    expect(ids()).not.toContain("detail:b");
  });

  it("opens from the keyboard: → opens, → again enters the panel, ← returns and closes", () => {
    render(<Table renderRowDetail={(row) => <p>Panel {row.name}</p>} />);
    const row = rowOf("a");
    row.focus();
    fireEvent.keyDown(row, { key: "ArrowRight" });
    expect(ids()).toContain("detail:a");
    fireEvent.keyDown(rowOf("a"), { key: "ArrowRight" });
    const panel = document.querySelector<HTMLElement>('[data-item="detail"]')!;
    expect(document.activeElement).toBe(panel);
    fireEvent.keyDown(panel, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(rowOf("a"));
    fireEvent.keyDown(rowOf("a"), { key: "ArrowLeft" });
    expect(ids()).toEqual(["a", "b", "c"]);
  });

  it("toggles with Enter when Enter opens nothing else, and leaves Enter to onRowOpen", () => {
    const onRowOpen = vi.fn();
    const { rerender } = render(<Table renderRowDetail={(row) => row.name} />);
    fireEvent.keyDown(rowOf("a"), { key: "Enter" });
    expect(ids()).toContain("detail:a");
    rerender(<Table renderRowDetail={(row) => row.name} onRowOpen={onRowOpen} />);
    fireEvent.keyDown(rowOf("b"), { key: "Enter" });
    expect(onRowOpen).toHaveBeenCalledOnce();
    expect(ids()).not.toContain("detail:b");
  });

  it("follows the reading direction", () => {
    document.documentElement.dir = "rtl";
    try {
      render(<Table renderRowDetail={(row) => row.name} />);
      expect(getComputedStyle(rowOf("a")).direction).toBe("rtl");
      fireEvent.keyDown(rowOf("a"), { key: "ArrowLeft" });
      expect(ids()).toContain("detail:a");
      fireEvent.keyDown(rowOf("a"), { key: "ArrowRight" });
      expect(ids()).not.toContain("detail:a");
    } finally {
      document.documentElement.dir = "";
    }
  });

  it("expand-all opens this view's rows, fetches nothing and keeps other pages' ids", () => {
    const onStateChange = vi.fn();
    render(
      <Table
        renderRowDetail={(row) => row.name}
        canExpandRow={(row) => row.id !== "c"}
        defaultState={{ expanded: ["other-page"] }}
        rowCount={300}
        onStateChange={onStateChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Expand all rows on this page" }));
    expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ expanded: ["other-page", "a", "b"] }), "expanded");
    fireEvent.click(screen.getByRole("button", { name: "Collapse all rows" }));
    expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ expanded: [] }), "expanded");
  });

  it("can leave expand-all out, keeping the header aligned", () => {
    render(<Table renderRowDetail={(row) => row.name} expandAll={false} />);
    expect(screen.queryByRole("button", { name: "Expand all rows on this page" })).toBeNull();
    expect(document.querySelector('.fa-dt-th[data-expander] .fa-dt-expander[data-spacer]')).toBeTruthy();
  });

  it("moves its row count out of aria-rowcount: open rows add lines the server does not count", () => {
    render(<Table renderRowDetail={(row) => row.name} rowCount={300} />);
    expect(screen.getByRole("grid").getAttribute("aria-rowcount")).toBe("-1");
  });

  it("leaves clicks, copies and selection inside a panel alone", () => {
    const onRowOpen = vi.fn();
    render(
      <Table
        renderRowDetail={(row) => <button type="button">Act on {row.name}</button>}
        defaultState={{ expanded: ["a"], selection: { b: true } }}
        rowOpen="click"
        onRowOpen={onRowOpen}
      />,
    );
    const button = screen.getByRole("button", { name: "Act on Alder" });
    fireEvent.click(button);
    expect(onRowOpen).not.toHaveBeenCalled();
    const copy = new Event("copy", { bubbles: true, cancelable: true });
    Object.assign(copy, { clipboardData: { setData: vi.fn() } });
    button.dispatchEvent(copy);
    expect(copy.defaultPrevented).toBe(false);
  });

  it("keeps a table nested in a panel to itself", () => {
    const inner = vi.fn();
    render(
      <Table
        selectable={false}
        defaultState={{ expanded: ["a"] }}
        renderRowDetail={() => <Table id="nested" label="Parts" rows={[{ id: "n1", name: "Nested" }]} onRowOpen={inner} />}
      />,
    );
    const nestedRow = rowOf("n1");
    fireEvent.keyDown(nestedRow, { key: "ArrowDown" });
    fireEvent.keyDown(nestedRow, { key: "Enter" });
    expect(inner).toHaveBeenCalledOnce();
    // The outer table did not take the row as its own line, and its row is still closed by nothing.
    expect(ids()).toContain("detail:a");
  });

  it("disables reordering, with the reason, while a row is open", () => {
    render(<Table renderRowDetail={(row) => row.name} reorder={{ onReorder: () => {} }} defaultState={{ expanded: ["a"] }} />);
    const grip = screen.getByRole("button", { name: "Reorder Alder" });
    expect(grip.getAttribute("aria-disabled")).toBe("true");
    expect(document.body.textContent).toContain("Collapse expanded rows to reorder");
    fireEvent.click(collapser("Alder"));
    expect(screen.getByRole("button", { name: "Reorder Alder" }).getAttribute("aria-disabled")).not.toBe("true");
  });

  it("lays panels out as lines between cards", () => {
    dimensions.width = 400;
    render(<Table renderRowDetail={(row) => <p>Panel {row.name}</p>} />);
    fireEvent.click(expander("Birch"));
    expect(ids()).toEqual(["a", "b", "detail:b", "c"]);
    expect(screen.getByText("Panel Birch").closest(".fa-dt-cards")).toBeTruthy();
  });

  it("offers expand-all in the settings menu on cards", async () => {
    dimensions.width = 400;
    render(<Table renderRowDetail={(row) => row.name} />);
    fireEvent.click(screen.getByRole("button", { name: "Columns and density" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Expand all rows on this page" }));
    expect(ids()).toEqual(["a", "detail:a", "b", "detail:b", "c", "detail:c"]);
  });
});

describe("tree rows", () => {
  const treeTable = (props: TableProps = {}) => <Table rows={nested} tree={treeOf()} {...props} />;

  it("is a treegrid whose rows state level, place and open state", () => {
    render(treeTable({ defaultState: { expanded: ["p"] } }));
    expect(screen.getByRole("treegrid").getAttribute("aria-rowcount")).toBe("-1");
    const attributes = (row: HTMLElement) => ["aria-level", "aria-posinset", "aria-setsize", "aria-expanded"].map((name) => row.getAttribute(name));
    expect(attributes(rowOf("p"))).toEqual(["1", "1", "3", "true"]);
    expect(attributes(rowOf("p1"))).toEqual(["2", "1", "2", null]);
    expect(attributes(rowOf("p2"))).toEqual(["2", "2", "2", "false"]);
    expect(attributes(rowOf("leaf"))).toEqual(["1", "3", "3", null]);
  });

  it("places top-level rows by the page and the server's count", () => {
    render(treeTable({ rowCount: 90, defaultState: { pagination: { pageIndex: 2, pageSize: 25 } } }));
    expect(rowOf("p").getAttribute("aria-posinset")).toBe("51");
    expect(rowOf("p").getAttribute("aria-setsize")).toBe("90");
  });

  it("does not guess a set size while the list is still growing", () => {
    render(treeTable({ infinite: { hasMore: true, onLoadMore: () => {} } }));
    expect(rowOf("p").getAttribute("aria-setsize")).toBe("-1");
  });

  it("indents through the row's level, in the first visible column by default", () => {
    render(treeTable({ defaultState: { expanded: ["p"] } }));
    expect(rowOf("p1").style.getPropertyValue("--fa-dt-level")).toBe("1");
    const cell = rowOf("p1").querySelector('[data-col][data-expander]');
    expect(cell?.textContent).toContain("First");
    expect(rowOf("p1").querySelector(".fa-dt-expander")?.hasAttribute("data-spacer")).toBe(true);
  });

  it("puts the expander in the column it is told to", () => {
    render(treeTable({ tree: treeOf({ column: "id" }) }));
    expect(rowOf("p").querySelector("[data-expander]")?.textContent).toContain("p");
    expect(rowOf("p").querySelector("[data-expander]")?.textContent).not.toContain("Parent");
  });

  it("walks the tree from the keyboard (treegrid)", () => {
    render(treeTable());
    const press = (key: string) => fireEvent.keyDown(document.activeElement!, { key });
    rowOf("p").focus();
    press("ArrowRight");
    expect(ids()).toEqual(["p", "p1", "p2", "lazy", "leaf"]);
    expect(document.activeElement).toBe(rowOf("p"));
    press("ArrowRight");
    expect(document.activeElement).toBe(rowOf("p1"));
    press("ArrowLeft");
    expect(document.activeElement).toBe(rowOf("p"));
    press("ArrowLeft");
    expect(ids()).toEqual(["p", "lazy", "leaf"]);
    expect(document.activeElement).toBe(rowOf("p"));
  });

  it("moves focus to the parent when a parent closes over the focused row", () => {
    render(treeTable({ defaultState: { expanded: ["p"] } }));
    rowOf("p1").focus();
    fireEvent.keyDown(rowOf("p1"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(rowOf("p2"));
    fireEvent.click(collapser("Parent"));
    expect(rowOf("p").getAttribute("tabindex")).toBe("0");
  });

  it("keeps the tab stop on its row when lines come and go above it", () => {
    render(treeTable());
    fireEvent.keyDown(rowOf("p"), { key: "ArrowDown" });
    expect(rowOf("lazy").getAttribute("tabindex")).toBe("0");
    fireEvent.click(expander("Parent"));
    expect(rowOf("lazy").getAttribute("tabindex")).toBe("0");
    expect(rowOf("p").getAttribute("tabindex")).toBe("-1");
  });

  it("toggles with Space on a table that does not select", () => {
    render(treeTable({ selectable: false }));
    fireEvent.keyDown(rowOf("p"), { key: " " });
    expect(ids()).toContain("p1");
  });

  it("puts a row's panel before its children, under one expander", () => {
    render(treeTable({ renderRowDetail: (row) => row.name, defaultState: { expanded: ["p"] } }));
    expect(ids()).toEqual(["p", "detail:p", "p1", "p2", "lazy", "leaf"]);
    const panelRow = document.querySelector<HTMLElement>('[data-item="detail"]')!;
    expect(panelRow.getAttribute("aria-level")).toBe("2");
    expect(rowOf("p").querySelectorAll("button.fa-dt-expander")).toHaveLength(1);
  });

  describe("lazy children", () => {
    function Lazy({ fail = false, children = [{ id: "c1", name: "Child" }] }: { fail?: boolean; children?: Item[] }) {
      const [rows, setRows] = useState(nested);
      const [seen] = useState(() => ({ calls: 0 }));
      return (
        <Table
          rows={rows}
          tree={treeOf({
            onLoadChildren: async (row, request) => {
              seen.calls++;
              calls(row.id, request.loaded);
              await Promise.resolve();
              if (fail && seen.calls === 1) throw new Error("offline");
              setRows((current) => current.map((item) => (item.id === row.id ? { ...item, children } : item)));
            },
          })}
        />
      );
    }
    const calls = vi.fn();
    afterEach(() => calls.mockClear());

    it("shows the row's expander before any child exists, and loads once on open", async () => {
      render(<Lazy />);
      expect(calls).not.toHaveBeenCalled();
      fireEvent.click(expander("Lazy"));
      expect(document.querySelector('[data-item="child-status"]')?.getAttribute("data-state")).toBe("loading");
      await waitFor(() => expect(ids()).toContain("c1"));
      expect(calls).toHaveBeenCalledOnce();
      expect(calls).toHaveBeenCalledWith("lazy", 0);
      expect(document.querySelector('[data-item="child-status"]')).toBeNull();
    });

    it("reserves the children's height while loading", () => {
      render(<Lazy />);
      fireEvent.click(expander("Lazy"));
      const line = document.querySelector<HTMLElement>('[data-item="child-status"]')!;
      expect(line.style.getPropertyValue("--fa-dt-status-lines")).toBe("2");
      expect(line.getAttribute("aria-level")).toBe("2");
      expect(line.getAttribute("aria-busy")).toBe("true");
    });

    it("shows a failure in the same box, with Retry", async () => {
      render(<Lazy fail />);
      fireEvent.click(expander("Lazy"));
      const status = () => document.querySelector<HTMLElement>('[data-item="child-status"]')!;
      await waitFor(() => expect(status().getAttribute("data-state")).toBe("error"));
      expect(status().style.getPropertyValue("--fa-dt-status-lines")).toBe("2");
      expect(status().textContent).toContain("Couldn't load rows under Lazy");
      fireEvent.click(within(status()).getByRole("button", { name: "Retry" }));
      await waitFor(() => expect(ids()).toContain("c1"));
      expect(calls).toHaveBeenCalledTimes(2);
    });

    it("tries again when a failed branch is closed and reopened", async () => {
      render(<Lazy fail />);
      fireEvent.click(expander("Lazy"));
      await waitFor(() => expect(document.querySelector('[data-state="error"]')).toBeTruthy());
      fireEvent.click(collapser("Lazy"));
      fireEvent.click(expander("Lazy"));
      await waitFor(() => expect(ids()).toContain("c1"));
      expect(calls).toHaveBeenCalledTimes(2);
    });

    it("treats a load that finds nothing as a row with no children", async () => {
      function Empty() {
        return <Table rows={nested} tree={treeOf({ onLoadChildren: () => Promise.resolve() })} />;
      }
      render(<Empty />);
      fireEvent.click(expander("Lazy"));
      await waitFor(() => expect(document.querySelector('[data-item="child-status"]')).toBeNull());
      expect(rowOf("lazy").hasAttribute("aria-expanded")).toBe(false);
      expect(screen.queryByRole("button", { name: "Collapse Lazy" })).toBeNull();
    });

    it("keeps loading until the children arrive when the host returns no promise", () => {
      const { rerender } = render(<Table rows={nested} tree={treeOf({ onLoadChildren: () => undefined })} defaultState={{ expanded: ["lazy"] }} />);
      expect(document.querySelector('[data-item="child-status"]')?.getAttribute("data-state")).toBe("loading");
      rerender(
        <Table
          rows={nested.map((row) => (row.id === "lazy" ? { ...row, children: [{ id: "c1", name: "Child" }] } : row))}
          tree={treeOf({ onLoadChildren: () => undefined })}
          defaultState={{ expanded: ["lazy"] }}
        />,
      );
      expect(ids()).toContain("c1");
    });

    it("loads an open row a host restored, without a click", async () => {
      const onLoadChildren = vi.fn(() => Promise.resolve());
      render(<Table rows={nested} tree={treeOf({ onLoadChildren })} state={{ expanded: ["lazy"] }} />);
      await waitFor(() => expect(onLoadChildren).toHaveBeenCalledOnce());
    });

    it("reads children held outside `rows` when getSubRows changes", () => {
      const held = (map: Record<string, Item[]>) => (row: Item) => row.children ?? map[row.id];
      const { rerender } = render(<Table rows={nested} tree={treeOf({ getSubRows: held({}) })} defaultState={{ expanded: ["lazy"] }} />);
      expect(ids()).not.toContain("c1");
      rerender(<Table rows={nested} tree={treeOf({ getSubRows: held({ lazy: [{ id: "c1", name: "Child" }] }) })} defaultState={{ expanded: ["lazy"] }} />);
      expect(ids()).toContain("c1");
    });

    it("abandons loads when the result changes", async () => {
      const signals: AbortSignal[] = [];
      const tree = treeOf({
        onLoadChildren: (_row, { signal }) => {
          signals.push(signal);
          return new Promise(() => {});
        },
      });
      const { rerender } = render(<Table rows={nested} tree={tree} queryKey="one" defaultState={{ expanded: ["lazy"] }} />);
      await waitFor(() => expect(signals).toHaveLength(1));
      rerender(<Table rows={nested} tree={tree} queryKey="two" defaultState={{ expanded: ["lazy"] }} />);
      await waitFor(() => expect(signals[0]?.aborted).toBe(true));
    });

    it("offers Show more for children the server has beyond those loaded, and asks with the offset", async () => {
      const onLoadChildren = vi.fn(() => Promise.resolve());
      const rows = [{ id: "big", name: "Big", count: 9, children: [{ id: "b1", name: "One" }] }];
      render(<Table rows={rows} tree={treeOf({ onLoadChildren })} defaultState={{ expanded: ["big"] }} />);
      expect(rowOf("b1").getAttribute("aria-setsize")).toBe("9");
      const more = document.querySelector<HTMLElement>('[data-item="child-more"]')!;
      expect(more.textContent).toContain("1 of 9");
      fireEvent.click(within(more).getByRole("button", { name: "Show more rows under Big" }));
      expect(onLoadChildren).toHaveBeenCalledWith(rows[0], expect.objectContaining({ loaded: 1 }));
      await act(async () => {});
    });

    it("shows a failed Show more in place, with Retry", async () => {
      const rows = [{ id: "big", name: "Big", count: 9, children: [{ id: "b1", name: "One" }] }];
      render(<Table rows={rows} tree={treeOf({ onLoadChildren: () => Promise.reject(new Error("no")) })} defaultState={{ expanded: ["big"] }} />);
      fireEvent.click(screen.getByRole("button", { name: "Show more rows under Big" }));
      await waitFor(() => expect(document.querySelector('[data-item="child-more"]')?.getAttribute("data-state")).toBe("error"));
      expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    });

    it("supports a server with more children and no count", () => {
      const rows = [{ id: "big", name: "Big", children: [{ id: "b1", name: "One" }] }];
      render(<Table rows={rows} tree={treeOf({ hasMoreChildren: (row) => row.id === "big" })} defaultState={{ expanded: ["big"] }} />);
      expect(rowOf("b1").getAttribute("aria-setsize")).toBe("-1");
      expect(document.querySelector('[data-item="child-more"]')?.textContent).toContain("Show more");
      expect(document.querySelector('[data-item="child-more"] .fa-dt-more-meta')).toBeNull();
    });

    it("expand-all opens loaded branches and never fetches", () => {
      const onLoadChildren = vi.fn();
      render(<Table rows={nested} tree={treeOf({ onLoadChildren })} />);
      fireEvent.click(screen.getByRole("button", { name: "Expand all rows on this page" }));
      expect(ids()).toEqual(["p", "p1", "p2", "p2x", "lazy", "leaf"]);
      expect(onLoadChildren).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Collapse all rows" })).toBeTruthy();
    });

    it("words expand-all for what it covers on an infinite list", () => {
      render(<Table rows={nested} tree={treeOf()} infinite={{ hasMore: true, onLoadMore: () => {} }} />);
      expect(screen.getByRole("button", { name: "Expand all loaded rows" })).toBeTruthy();
    });
  });

  describe("selection", () => {
    it("selects the row alone, and names what it could not reach", () => {
      const onStateChange = vi.fn();
      render(treeTable({ onStateChange, rows: [...nested, { id: "part", name: "Part", count: 5, children: [{ id: "part1", name: "One" }] }] }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Select Lazy" }));
      expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ selection: { lazy: true } }), "selection", { unloaded: ["lazy"] });
      fireEvent.click(screen.getByRole("checkbox", { name: "Select Part" }));
      expect(onStateChange).toHaveBeenLastCalledWith(expect.anything(), "selection", { unloaded: ["part"] });
      fireEvent.click(screen.getByRole("checkbox", { name: "Select Parent" }));
      expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ selection: { lazy: true, part: true, p: true } }), "selection", { unloaded: [] });
    });

    it("keeps a selected child selected when its parent closes, and acts on it in bulk", () => {
      const renderBulkActions = vi.fn((targets: Item[]) => <span>{targets.map((row) => row.name).join("+")}</span>);
      render(treeTable({ defaultState: { expanded: ["p"] }, renderBulkActions }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Select First" }));
      fireEvent.click(collapser("Parent"));
      expect(document.body.textContent).toContain("First");
      expect(renderBulkActions.mock.lastCall?.[0].map((row) => row.id)).toEqual(["p1"]);
    });

    it("Select all takes the rows on screen and passes over context rows", () => {
      const onStateChange = vi.fn();
      render(treeTable({ onStateChange, defaultState: { expanded: ["p"] }, tree: treeOf({ isContext: (row) => row.id === "p" }) }));
      expect(rowOf("p").hasAttribute("data-context")).toBe(true);
      fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows on this page" }));
      const state = onStateChange.mock.lastCall![0] as DataTableState;
      expect(Object.keys(state.selection)).toEqual(["p1", "p2", "lazy", "leaf"]);
    });

    it("leaves rows that are not selected alone across a Shift range", () => {
      const onStateChange = vi.fn();
      render(treeTable({ onStateChange, defaultState: { expanded: ["p"] } }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Select First" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Select Lazy" }), { shiftKey: true });
      const state = onStateChange.mock.lastCall![0] as DataTableState;
      expect(Object.keys(state.selection).sort()).toEqual(["lazy", "p1", "p2"]);
    });
  });

  describe("filtering", () => {
    it("opens a result's branches without writing `expanded`", () => {
      const onStateChange = vi.fn();
      render(treeTable({ onStateChange, state: { search: "fir", filters: [] }, search: { fields: [] } }));
      expect(ids()).toEqual(["p", "p1", "p2", "p2x", "lazy", "leaf"]);
      expect(onStateChange).not.toHaveBeenCalled();
    });

    it("lets a person close a branch of the result, until the query changes", () => {
      const props = { search: { fields: [] }, tree: treeOf() };
      const { rerender } = render(treeTable({ ...props, state: { search: "one" } }));
      fireEvent.click(collapser("Parent"));
      expect(ids()).toEqual(["p", "lazy", "leaf"]);
      rerender(treeTable({ ...props, state: { search: "two" } }));
      expect(ids()).toContain("p1");
    });

    it("keeps closed branches closed when asked to", () => {
      render(treeTable({ state: { search: "one" }, search: { fields: [] }, tree: treeOf({ openMatches: false }) }));
      expect(ids()).toEqual(["p", "lazy", "leaf"]);
    });
  });

  it("draws children under their group, and stays open through a page of cards", () => {
    render(
      treeTable({
        grouping: {
          groupOf: (row) => (row.id === "p" ? "one" : "two"),
          groups: [
            { id: "one", label: "One", count: 1 },
            { id: "two", label: "Two", count: 2 },
          ],
        },
        defaultState: { expanded: ["p"] },
      }),
    );
    const header = document.querySelector<HTMLElement>('[data-item="group"]')!;
    expect(["aria-level", "aria-posinset", "aria-setsize", "aria-expanded"].map((name) => header.getAttribute(name))).toEqual(["1", "1", "2", "true"]);
    expect(rowOf("p").getAttribute("aria-level")).toBe("2");
    expect(rowOf("p1").getAttribute("aria-level")).toBe("3");
  });

  it("gives a child's cells the same value filter menu as a top-level row's", async () => {
    const filtered = createDataTableColumns<Item>();
    const fields = filtered.columns([
      filtered.accessor("name", { header: "Name", filter: filters.text({ field: "Name" }) }),
    ]);
    render(treeTable({ columns: fields, defaultState: { expanded: ["p"] } }));
    fireEvent.contextMenu(rowOf("p1").querySelector("[data-col] .fa-dt-text")!);
    expect(await screen.findByText("Only this value")).toBeTruthy();
  });

  it("draws cards with their level, expander and treegrid state", () => {
    dimensions.width = 400;
    render(treeTable({ defaultState: { expanded: ["p"] } }));
    const card = rowOf("p1");
    expect(card.classList.contains("fa-dt-card")).toBe(true);
    expect(card.getAttribute("aria-level")).toBe("2");
    expect(card.style.getPropertyValue("--fa-dt-level")).toBe("1");
    expect(screen.getByRole("button", { name: "Expand Second" })).toBeTruthy();
  });

  it("edits a child's cell like any row's", () => {
    const edit = vi.fn();
    const editable = createDataTableColumns<Item>();
    const fields = editable.columns([editable.accessor("name", { header: "Name", edit: { kind: "text" } })]);
    render(treeTable({ columns: fields, onCellEdit: edit, defaultState: { expanded: ["p"] } }));
    expect(rowOf("p1").querySelector("[data-cell-editable]")).toBeTruthy();
  });

  it("disables reordering once rows are open, and allows it among closed top-level rows", () => {
    const grip = () => screen.getByRole("button", { name: "Reorder Parent" }).getAttribute("aria-disabled");
    const { rerender } = render(treeTable({ reorder: { onReorder: () => {} } }));
    expect(grip()).not.toBe("true");
    rerender(treeTable({ reorder: { onReorder: () => {} }, state: { expanded: ["p"] } }));
    expect(grip()).toBe("true");
  });

  describe("export", () => {
    const copy = async (props: TableProps) => {
      const writeText = vi.fn(() => Promise.resolve());
      vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
      render(treeTable({ export: { headers: true }, ...props }));
      fireEvent.click(screen.getByRole("button", { name: "Export" }));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Copy as table" }));
      await waitFor(() => expect(writeText).toHaveBeenCalled());
      return (writeText.mock.calls as unknown as string[][])[0]![0]!;
    };

    it("exports every loaded row in tree order, open or not, with its level", async () => {
      const text = await copy({});
      expect(text.trim().split("\r\n")).toEqual([
        "Level\tName\tReference",
        "1\tParent\tp",
        "2\tFirst\tp1",
        "2\tSecond\tp2",
        "3\tDeep\tp2x",
        "1\tLazy\tlazy",
        "1\tLeaf\tleaf",
      ]);
    });

    it("exports a selection as the rows chosen, each with its level", async () => {
      const text = await copy({ defaultState: { expanded: ["p"], selection: { p1: true } } });
      expect(text.trim().split("\r\n")).toEqual(["Level\tName\tReference", "2\tFirst\tp1"]);
    });

    it("tells a server export what is open", async () => {
      const onExport = vi.fn();
      render(treeTable({ export: true, onExport, defaultState: { expanded: ["p"] } }));
      fireEvent.click(screen.getByRole("button", { name: "Export" }));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Copy as table" }));
      await waitFor(() => expect(onExport).toHaveBeenCalled());
      expect(onExport.mock.calls[0]?.[0]).toMatchObject({ expanded: ["p"] });
    });
  });
});

describe("clipboard", () => {
  it("copies through the shared fallback where the page has no Clipboard API", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    const exec = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: exec });
    render(<Table export />);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy as table" }));
    await waitFor(() => expect(exec).toHaveBeenCalledWith("copy"));
    expect(document.querySelector(".fa-dt-announcer")?.parentElement?.textContent).toContain("3");
  });

  it("reports a refused copy as before", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: () => Promise.reject(new Error("Permission refused")) },
    });
    render(<Table export />);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy as table" }));
    await screen.findByText("Permission refused");
  });
});

it("keeps export text unchanged outside trees", () => {
  expect(exportTsv({ rows: flat, columns: [{ id: "n", header: "N", value: (row: Item) => row.name }] })).toContain("Alder");
});
