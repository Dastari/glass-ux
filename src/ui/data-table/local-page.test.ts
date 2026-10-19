import { describe, expect, it } from "vitest";
import { createDataTableColumns } from "./columns.js";
import { filters } from "./filters/index.js";
import { localPage } from "./local-page.js";
import type { DataTableState } from "./types.js";

interface RecordRow {
  id: string;
  name: string;
  cpu: number;
  memory: number;
  owner: { name: string };
}
const col = createDataTableColumns<RecordRow>();
const columns = col.columns([
  col.accessor("name", {
    id: "process",
    header: "Process",
    filter: filters.text({ field: "Name" }),
  }),
  col.accessor("cpu", {
    header: "CPU",
    filter: filters.number({ field: "CpuPercent", server: "decimal" }),
  }),
  col.accessor((row) => row.memory / 1024, {
    id: "memoryKiB",
    header: "Memory",
    filter: { none: "computed test column" },
  }),
]);
const rows: RecordRow[] = [
  { id: "a", name: "agent2", cpu: 2, memory: 4096, owner: { name: "Zoe" } },
  { id: "b", name: "agent10", cpu: 10, memory: 1024, owner: { name: "Ari" } },
  { id: "c", name: "agent1", cpu: 2, memory: 2048, owner: { name: "Mia" } },
  { id: "d", name: "browser", cpu: 100, memory: 8192, owner: { name: "Ari" } },
];
const state: Pick<
  DataTableState,
  "filters" | "sorting" | "pagination" | "search"
> = {
  filters: [],
  sorting: [],
  pagination: { pageIndex: 0, pageSize: 25 },
  search: "",
};
const ids = (result: ReturnType<typeof localPage<RecordRow>>) =>
  result.rows.map((row) => row.id);
describe("localPage over a complete collection", () => {
  it("searches and filters before counting and paging", () => {
    const result = localPage(
      rows,
      columns,
      {
        ...state,
        search: "agent",
        filters: [{ id: "cpu", value: { op: "lte", value: 2 } }],
        pagination: { pageIndex: 1, pageSize: 1 },
      },
      { fields: ["process"] },
    );
    expect(result.count).toBe(2);
    expect(ids(result)).toEqual(["c"]);
  });
  it("sorts numeric readings numerically, then preserves source order for ties", () => {
    expect(
      ids(
        localPage(rows, columns, {
          ...state,
          sorting: [{ id: "cpu", desc: false }],
        }),
      ),
    ).toEqual(["a", "c", "b", "d"]);
    expect(
      ids(
        localPage(rows, columns, {
          ...state,
          sorting: [
            { id: "cpu", desc: true },
            { id: "process", desc: false },
          ],
        }),
      ),
    ).toEqual(["d", "b", "c", "a"]);
  });
  it("resolves aliased accessor keys and function accessors", () => {
    expect(
      ids(
        localPage(rows, columns, {
          ...state,
          sorting: [{ id: "process", desc: false }],
        }),
      ),
    ).toEqual(["c", "a", "b", "d"]);
    expect(
      ids(
        localPage(rows, columns, {
          ...state,
          sorting: [{ id: "memoryKiB", desc: false }],
        }),
      ),
    ).toEqual(["b", "c", "a", "d"]);
  });
  it("keeps locale, numeric-text, null and multi-sort semantics", () => {
    const values = [
      "a10",
      "a2",
      "A2",
      "á2",
      "",
      null,
      undefined,
      "Z",
      "Ä",
      "01",
      "1",
    ];
    const data = values.map((name, index) => ({
      id: String(index),
      name,
      owner: { name },
    }));
    const defs = [{ id: "title", accessorKey: "owner.name" }];
    const expected = data.toSorted((a, b) =>
      String(a.name ?? "").localeCompare(String(b.name ?? ""), "en-AU", {
        numeric: true,
      }),
    );
    for (const desc of [false, true]) {
      const result = localPage(data, defs, {
        ...state,
        sorting: [{ id: "title", desc }],
      });
      expect(result.rows.map((row) => row.id)).toEqual(
        (desc
          ? data.toSorted(
              (a, b) =>
                -String(a.name ?? "").localeCompare(
                  String(b.name ?? ""),
                  "en-AU",
                  { numeric: true },
                ),
            )
          : expected
        ).map((row) => row.id),
      );
    }
    // A missing definition still reads a nested path supplied by the host.
    expect(
      localPage(data, [], {
        ...state,
        sorting: [{ id: "owner.name", desc: false }],
      }).rows,
    ).toEqual(expected);
  });
  it("does not mutate input and returns an empty page with the filtered count", () => {
    const original = [...rows];
    const result = localPage(rows, columns, {
      ...state,
      sorting: [{ id: "cpu", desc: true }],
      pagination: { pageIndex: 5, pageSize: 25 },
    });
    expect(result.rows).toEqual([]);
    expect(result.count).toBe(4);
    expect(rows).toEqual(original);
  });
});
