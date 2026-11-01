import { describe, expect, it } from "vitest";
import {
  expandableIds,
  expansionLines,
  filterTreeRows,
  hasOpenLines,
  survivingLine,
  unloadedSelection,
  type ChildState,
  type ExpandableRow,
  type ExpansionPlan,
} from "./expansion.js";
import { groupItems } from "./grouping.js";

interface Node extends ExpandableRow<string> {
  subRows: Node[];
}
const node = (id: string, subRows: Node[] = [], parentId?: string): Node => ({
  id,
  original: id,
  parentId,
  subRows,
});
const plain = (rows: Node[]) =>
  rows.map((row) => ({ kind: "row" as const, key: row.id, row, group: "" }));
const LOADED: ChildState = { unloaded: false, total: undefined, more: false };
const plan = (
  open: string[],
  overrides: Partial<ExpansionPlan<Node>> = {},
): ExpansionPlan<Node> => ({
  isOpen: (row) => open.includes(row.id),
  hasPanel: () => false,
  ...overrides,
});
const shape = (lines: ReturnType<typeof expansionLines<Node>>) =>
  lines.map((line) => (line.kind === "row" ? line.row.id : `${line.kind}:${line.key.split(":")[1]}`));

describe("expansionLines", () => {
  const tree = [node("a", [node("a1", [node("a1x")]), node("a2")]), node("b")];
  const top = { first: 1, setSize: 2 };

  it("puts a row's panel straight after it, then its children", () => {
    const lines = expansionLines(
      plain(tree),
      plan(["a"], { hasPanel: (row) => row.id === "a", childState: () => LOADED }),
      top,
    );
    expect(shape(lines)).toEqual(["a", "detail:a", "a1", "a2", "b"]);
  });

  it("shows children only down an open path", () => {
    const lines = expansionLines(plain(tree), plan(["a1"], { childState: () => LOADED }), top);
    expect(shape(lines)).toEqual(["a", "b"]);
  });

  it("gives every row its level and place among its siblings", () => {
    const lines = expansionLines(plain(tree), plan(["a", "a1"], { childState: () => LOADED }), {
      first: 26,
      setSize: 90,
    });
    const rows = lines.flatMap((line) => (line.kind === "row" ? [line] : []));
    expect(rows.map(({ level, position, setSize }) => [level, position, setSize])).toEqual([
      [1, 26, 90],
      [2, 1, 2],
      [3, 1, 1],
      [2, 2, 2],
      [1, 27, 90],
    ]);
  });

  it("holds the room of the children a loading branch knows about, up to five rows", () => {
    const status = (total: number | undefined) =>
      expansionLines(
        plain([node("a")]),
        plan(["a"], { childState: () => ({ unloaded: true, total, more: false }) }),
        top,
      )[1];
    expect(status(undefined)).toMatchObject({ kind: "child-status", lines: 1, level: 2 });
    expect(status(3)).toMatchObject({ lines: 3 });
    expect(status(4000)).toMatchObject({ lines: 5 });
  });

  it("ends partly loaded children with Show more, and counts the server's siblings", () => {
    const lines = expansionLines(
      plain([node("a", [node("a1"), node("a2")])]),
      plan(["a"], { childState: () => ({ unloaded: false, total: 9, more: true }) }),
      top,
    );
    expect(shape(lines)).toEqual(["a", "a1", "a2", "child-more:a"]);
    expect(lines[1]).toMatchObject({ setSize: 9 });
    expect(lines[3]).toMatchObject({ loaded: 2, total: 9 });
  });

  it("says the set is unknown when the server has more and no count", () => {
    const lines = expansionLines(
      plain([node("a", [node("a1")])]),
      plan(["a"], { childState: () => ({ unloaded: false, total: undefined, more: true }) }),
      top,
    );
    expect(lines[1]).toMatchObject({ setSize: -1 });
  });

  it("keeps rows and panels inside their group, at one level deeper", () => {
    const rows = [node("a", [node("a1")]), node("b")];
    const items = groupItems(
      rows,
      (row) => (row.id === "a" ? "one" : "two"),
      [
        { id: "one", label: "One", count: 1 },
        { id: "two", label: "Two", count: 4 },
      ],
      { collapsed: [], shown: {} },
    );
    const lines = expansionLines(
      items,
      plan(["a"], { hasPanel: (row) => row.id === "a", childState: () => LOADED }),
      top,
    );
    expect(lines.map((line) => line.kind)).toEqual([
      "group",
      "row",
      "detail",
      "row",
      "group",
      "row",
      "more",
    ]);
    expect(lines[1]).toMatchObject({ level: 2, position: 1, setSize: 1 });
    expect(lines[3]).toMatchObject({ level: 3, group: "one" });
    expect(lines[5]).toMatchObject({ level: 2, position: 1, setSize: 4 });
  });

  it("counts anything more than top-level rows and group lines as open", () => {
    expect(hasOpenLines(expansionLines(plain(tree), plan([], { childState: () => LOADED }), top))).toBe(false);
    expect(hasOpenLines(expansionLines(plain(tree), plan(["a"], { childState: () => LOADED }), top))).toBe(true);
    expect(hasOpenLines(expansionLines(plain(tree), plan(["b"], { hasPanel: () => true }), top))).toBe(true);
  });
});

describe("survivingLine", () => {
  const next = new Map([["a", 0], ["b", 1]]);
  it("finds a line that stayed, at its new place", () => {
    expect(survivingLine(["x", "b"], 1, next)).toBe(1);
  });
  it("passes a line that went to the parent before it", () => {
    expect(survivingLine(["a", "a1", "a2", "b"], 2, next)).toBe(0);
  });
  it("gives up when nothing before it remains", () => {
    expect(survivingLine(["x", "y"], 1, next)).toBe(-1);
  });
});

describe("expandableIds", () => {
  it("leaves out rows that would have to fetch", () => {
    const rows = [node("loaded", [node("child")]), node("lazy")];
    expect(expandableIds(rows, (row) => row.subRows.length > 0)).toEqual(["loaded"]);
  });
});

describe("unloadedSelection", () => {
  const rows = new Map([
    ["full", node("full")],
    ["lazy", node("lazy")],
    ["lazy2", node("lazy2")],
  ]);
  const notLoaded = (row: Node) => row.id.startsWith("lazy");
  it("names only what was just selected", () => {
    expect(unloadedSelection({ lazy2: true }, { lazy: true, lazy2: true, full: true }, rows, notLoaded)).toEqual(["lazy"]);
  });
  it("ignores ids with no loaded row, and rows being cleared", () => {
    expect(unloadedSelection({ lazy: true }, { gone: true }, rows, notLoaded)).toEqual([]);
  });
});

describe("filterTreeRows", () => {
  interface Item {
    id: string;
    children?: Item[];
  }
  const items: Item[] = [
    { id: "keep", children: [{ id: "other" }, { id: "path", children: [{ id: "match" }, { id: "x" }] }] },
    { id: "none", children: [{ id: "x2" }] },
    { id: "match-top", children: [{ id: "y" }] },
    { id: "unloaded" },
  ];
  const run = (needle: string) =>
    filterTreeRows({
      rows: items,
      getSubRows: (item) => item.children,
      withSubRows: (item, children) => ({ ...item, children }),
      getRowId: (item) => item.id,
      matches: (item) => item.id.includes(needle),
    });

  it("keeps a match's ancestors, marked as context", () => {
    const { rows, context } = run("match");
    expect(rows.map((item) => item.id)).toEqual(["keep", "match-top"]);
    expect(rows[0]?.children?.map((item) => item.id)).toEqual(["path"]);
    expect(rows[0]?.children?.[0]?.children?.map((item) => item.id)).toEqual(["match"]);
    expect([...context]).toEqual(["path", "keep"]);
  });

  it("keeps a matching parent's children only if they match too", () => {
    expect(run("match").rows[1]?.children).toEqual([]);
  });

  it("leaves an unloaded row's children unset, not empty", () => {
    expect(run("unloaded").rows[0]).toEqual({ id: "unloaded" });
  });

  it("does not touch the rows it is given", () => {
    run("match");
    expect(items[0]?.children).toHaveLength(2);
  });
});
