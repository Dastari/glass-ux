import type {} from "./runtime.js";
// Deliberately separate from the gallery: stress fixtures consume the built release API.
import { createRoot } from "react-dom/client";
import { useLayoutEffect, useMemo, useState } from "react";
import {
  DataTable,
  createDataTableColumns,
  filters,
  localPage,
  SparklineCell,
} from "glass-ux/data-table";
import { Tree } from "glass-ux/tree";
import { TooltipProvider } from "glass-ux/tooltip";
import "glass-ux/styles.css";

const params = new URLSearchParams(location.search);
const count = Number(params.get("rows") ?? 10000);
const wide = params.has("wide");
const kind = params.get("kind") ?? "table";
document.documentElement.dataset.glass = params.get("glass") ?? "full";
document.body.style.cssText = "margin:0;height:100vh;overflow:hidden";
const root = document.getElementById("root")!;
root.style.cssText = "height:100%;padding:16px;box-sizing:border-box";
window.__perf ??= { keys: 0, cells: 0 };
const rows = Array.from({ length: count }, (_, i) => ({
  id: String(i),
  name: `Sample ${(i * 7919) % count}`,
  value: i % 100,
  owner: { name: `Person ${(i * 31) % 100}` },
  trend: [10, 25, 20, 35, 30, i % 100],
}));
const col = createDataTableColumns<(typeof rows)[number]>();
const columns = col.columns([
  col.accessor("name", {
    header: "Name",
    pin: true,
    cardRole: "title",
    width: 16,
    filter: filters.text({ field: "name" }),
    cell: ({ getValue }) => {
      window.__perf.cells++;
      return getValue();
    },
  }),
  ...Array.from({ length: wide ? 24 : 5 }, (_, i) =>
    col.accessor("value", {
      id: `v${i}`,
      header: `Reading ${i}`,
      width: 7,
      minWidth: 6,
      hideable: false,
      priority: wide ? 1 : 3,
      cell: ({ getValue }) => {
        window.__perf.cells++;
        return getValue();
      },
    }),
  ),
  col.accessor("trend", {
    header: "Trend",
    width: 8,
    cell: ({ getValue }) => (
      <SparklineCell values={getValue()} label="Sample trend" />
    ),
  }),
]);
const getRowId = (row: (typeof rows)[number]) => row.id;
const nodes = rows.map(({ id, name }) => ({ id, label: name }));
const grouping = params.has("grouped")
  ? {
      groups: Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        label: `Group ${i}`,
        count: rows.filter((row) => Number(row.id) % 10 === i).length,
      })),
      groupOf: (row: (typeof rows)[number]) => String(Number(row.id) % 10),
      pageSize: count,
    }
  : undefined;

function Fixture() {
  const [data, setData] = useState(rows);
  const [query, setQuery] = useState("");
  const shown = useMemo(
    () =>
      localPage(
        data,
        columns,
        {
          sorting: [],
          filters: [],
          search: query,
          pagination: { pageIndex: 0, pageSize: count + 1 },
        },
        { fields: ["name"] },
      ).rows,
    [data, query],
  );
  useLayoutEffect(() => {
    window.__ready = true;
  });
  window.__fixture = {
    update: () =>
      setData((current) =>
        current.map((row, i) =>
          i === 10 ? { ...row, value: row.value + 1 } : row,
        ),
      ),
    add: () =>
      setData((current) => [
        { ...rows[0], id: `new-${current.length}` },
        ...current,
      ]),
    sort: (numeric = false) => {
      const start = performance.now();
      const result = localPage(rows, columns, {
        sorting: [{ id: numeric ? "v0" : "name", desc: false }],
        filters: [],
        pagination: { pageIndex: 0, pageSize: 25 },
      });
      return { ms: performance.now() - start, first: result.rows[0]?.name };
    },
  };
  return (
    <TooltipProvider>
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <input
          aria-label="Filter samples"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div style={{ minHeight: 0, flex: 1 }}>
          {kind === "tree" ? (
            <Tree nodes={nodes} aria-label="Samples" />
          ) : (
            <DataTable
              id="performance-fixture"
              label="Samples"
              rows={shown}
              columns={columns}
              getRowId={getRowId}
              getRowLabel={(row) => row.name}
              live
              grouping={grouping}
              reorder={
                params.has("reorder")
                  ? { onReorder: (move) => setData([...move.rows]) }
                  : undefined
              }
              pageSizes={[count]}
              defaultState={{ pagination: { pageIndex: 0, pageSize: count } }}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
createRoot(root).render(<Fixture />);
