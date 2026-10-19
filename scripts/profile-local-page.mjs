/** Algorithm benchmark, independent of React/GPU. Run against pnpm build's dist/. */
import { localPage } from "../dist/ui/data-table/local-page.js";
import { writeFile } from "node:fs/promises";
const [output = "/tmp/glass-local-page.json"] = process.argv.slice(2);
const columns = [
  { accessorKey: "name", id: "name" },
  { accessorKey: "value", id: "value" },
];
const results = [];
for (const count of [1000, 10000, 100000]) {
  const rows = Array.from({ length: count }, (_, i) => ({
    name: `Sample ${(i * 7919) % count}`,
    value: (i * 7919) % count,
  }));
  for (const id of ["name", "value"]) {
    const times = [];
    for (let i = 0; i < 4; i++) {
      const start = performance.now();
      const result = localPage(rows, columns, {
        sorting: [{ id, desc: false }],
        filters: [],
        pagination: { pageIndex: 0, pageSize: 25 },
      });
      times.push(performance.now() - start);
      if (result.rows[0]?.value !== 0 || result.count !== count)
        throw Error("Sort result changed");
    }
    results.push({ count, id, times });
    console.log(JSON.stringify(results.at(-1)));
  }
}
await writeFile(
  output,
  JSON.stringify({ node: process.version, results }, null, 2),
);
