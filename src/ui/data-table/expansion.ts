/**
 * Row expansion: detail panels and tree rows. The body is a list of lines in display order;
 * a row that opens adds its panel and its children after it, so everything that counts lines
 * (virtualisation, focus, aria-rowindex) sees the same list. Pure, so it runs on the server.
 */
import type { RowData, RowSelectionState } from "@tanstack/react-table";
import type { GroupedItem } from "./grouping.js";

/** Why a parent's children are not on screen yet. */
export type ChildStatus = "idle" | "loading" | "failed";

/** A row as the line builder reads it: TanStack's row satisfies this. */
export interface ExpandableRow<T = unknown> {
  id: string;
  original: T;
  parentId?: string;
  subRows: readonly ExpandableRow<T>[];
}

/** A data row, with its place among its siblings. */
export interface RowLine<R> {
  kind: "row";
  key: string;
  row: R;
  group: string;
  /** 1 at the top level; 2 under a group header. */
  level: number;
  /** One-based position among its siblings. */
  position: number;
  /** Siblings on the server, or -1 when unknown (`aria-setsize`). */
  setSize: number;
  /** A child of another row. */
  nested: boolean;
}

/** The host's panel under an open row. */
export interface DetailLine<R> {
  kind: "detail";
  key: string;
  row: R;
  level: number;
}

/** A parent's children on their way, or their failure, in reserved space. */
export interface ChildStatusLine<R> {
  kind: "child-status";
  key: string;
  row: R;
  level: number;
  /** Row heights to hold, so the children replace this line in place. */
  lines: number;
}

/** The server has more children than are loaded. */
export interface ChildMoreLine<R> {
  kind: "child-more";
  key: string;
  row: R;
  level: number;
  /** Children loaded. */
  loaded: number;
  /** Children on the server, when it says. */
  total: number | undefined;
}

export type BodyLine<R> =
  | Exclude<GroupedItem<R>, { kind: "row" }>
  | RowLine<R>
  | DetailLine<R>
  | ChildStatusLine<R>
  | ChildMoreLine<R>;

/** What the builder needs to know about one row. */
export interface ExpansionPlan<R> {
  isOpen: (row: R) => boolean;
  hasPanel: (row: R) => boolean;
  /** Tree tables: how the row's children stand. */
  childState?: (row: R) => ChildState;
}

export interface ChildState {
  /** The server has children and none are loaded. */
  unloaded: boolean;
  /** Children on the server, when it says. */
  total: number | undefined;
  /** More children than are loaded. */
  more: boolean;
}

/** Most row heights a loading branch reserves: beyond that, its children push rows anyway. */
export const MAX_RESERVED_LINES = 5;

/** Keys for lines that are not rows; the NUL keeps them apart from any row id. */
const lineKey = (kind: string, rowId: string) => `\u0000${kind}:${rowId}`;

function pushRow<R extends ExpandableRow>(
  lines: BodyLine<R>[],
  line: RowLine<R>,
  plan: ExpansionPlan<R>,
) {
  lines.push(line);
  const { row, level, group } = line;
  if (!plan.isOpen(row)) return;
  if (plan.hasPanel(row))
    lines.push({
      kind: "detail",
      key: lineKey("detail", row.id),
      row,
      level: level + 1,
    });
  const children = plan.childState?.(row);
  if (!children) return;
  const subRows = row.subRows as readonly R[];
  if (children.unloaded) {
    lines.push({
      kind: "child-status",
      key: lineKey("status", row.id),
      row,
      level: level + 1,
      lines: Math.max(
        1,
        Math.min(children.total ?? 1, MAX_RESERVED_LINES),
      ),
    });
    return;
  }
  const setSize = children.total ?? (children.more ? -1 : subRows.length);
  subRows.forEach((child, index) =>
    pushRow(
      lines,
      {
        kind: "row",
        key: child.id,
        row: child,
        group,
        level: level + 1,
        position: index + 1,
        setSize,
        nested: true,
      },
      plan,
    ),
  );
  if (children.more)
    lines.push({
      kind: "child-more",
      key: lineKey("more", row.id),
      row,
      level: level + 1,
      loaded: subRows.length,
      total: children.total,
    });
}

/**
 * The body in display order. `items` are the group headers and rows from `groupItems`, or
 * the plain rows of an ungrouped table; `topLevel` places those rows among their siblings.
 */
export function expansionLines<R extends ExpandableRow>(
  items: readonly GroupedItem<R>[],
  plan: ExpansionPlan<R>,
  topLevel: { first: number; setSize: number },
): BodyLine<R>[] {
  const lines: BodyLine<R>[] = [];
  const grouped = items.some((item) => item.kind === "group");
  let position = 0;
  let groupSize = -1;
  for (const item of items) {
    if (item.kind === "group") {
      position = 0;
      groupSize = item.group.count;
      lines.push(item);
    } else if (item.kind === "more") lines.push(item);
    else
      pushRow(
        lines,
        {
          kind: "row",
          key: item.row.id,
          row: item.row,
          group: item.group,
          level: grouped ? 2 : 1,
          position: grouped ? ++position : topLevel.first + position++,
          setSize: grouped ? groupSize : topLevel.setSize,
          nested: false,
        },
        plan,
      );
  }
  return lines;
}

/** Whether any line is more than a row or group line: the visible order is no longer flat. */
export const hasOpenLines = <R,>(lines: readonly BodyLine<R>[]) =>
  lines.some(
    (line) =>
      line.kind === "detail" ||
      line.kind === "child-status" ||
      line.kind === "child-more" ||
      (line.kind === "row" && line.nested),
  );

/**
 * The first line to survive a change, walking back from `index`: a parent collapsing takes
 * the lines after it, so the parent is what remains. -1 when nothing before it remains.
 */
export function survivingLine(
  previous: readonly string[],
  index: number,
  next: ReadonlyMap<string, number>,
) {
  for (let at = Math.min(index, previous.length - 1); at >= 0; at--) {
    const found = next.get(previous[at]!);
    if (found !== undefined) return found;
  }
  return -1;
}

/** Ids an expand-all opens: never a row that would have to fetch anything. */
export function expandableIds<R extends ExpandableRow>(
  rows: readonly R[],
  canOpenLoaded: (row: R) => boolean,
) {
  return rows.filter(canOpenLoaded).map((row) => row.id);
}

/** Rows just added to a selection whose children are not all loaded (as Tree's `details.unloaded`). */
export function unloadedSelection<R extends ExpandableRow>(
  before: RowSelectionState,
  after: RowSelectionState,
  rowsById: ReadonlyMap<string, R>,
  notLoaded: (row: R) => boolean,
) {
  const unloaded: string[] = [];
  for (const id in after) {
    if (!after[id] || before[id]) continue;
    const row = rowsById.get(id);
    if (row && notLoaded(row)) unloaded.push(id);
  }
  return unloaded;
}

/** Options for {@link filterTreeRows}. */
export interface FilterTreeOptions<T extends RowData> {
  /** The rows at the top of the tree. */
  rows: readonly T[];
  /** A row's loaded children, as `DataTableTree.getSubRows` reads them. */
  getSubRows: (row: T) => readonly T[] | null | undefined;
  /** A copy of the row holding these children in place of its own. */
  withSubRows: (row: T, children: T[]) => T;
  /** The row's own match: `matchesFilter`, a search, or any predicate. */
  matches: (row: T) => boolean;
  /** Returns a stable row identifier. */
  getRowId: (row: T) => string;
}

/** The result of {@link filterTreeRows}. */
export interface FilteredTree<T extends RowData> {
  /** The matching rows and their ancestors, in the same order. */
  rows: T[];
  /** Ids of rows kept only as the path to a match: pass them to `tree.isContext`. */
  context: ReadonlySet<string>;
}

/**
 * Filter loaded rows the way a tree table reads them: a match keeps its ancestors, marked as
 * context, and a row's children stay only if they match too. It sees loaded rows alone, so a
 * match in a branch that has not loaded is the server's to find.
 */
export function filterTreeRows<T extends RowData>({
  rows,
  getSubRows,
  withSubRows,
  matches,
  getRowId,
}: FilterTreeOptions<T>): FilteredTree<T> {
  const context = new Set<string>();
  const walk = (level: readonly T[]) =>
    level.flatMap((row): T[] => {
      const children = getSubRows(row);
      const kept = children ? walk(children) : [];
      const own = matches(row);
      if (!own && !kept.length) return [];
      if (!own) context.add(getRowId(row));
      return [children ? withSubRows(row, kept) : row];
    });
  return { rows: walk(rows), context };
}
