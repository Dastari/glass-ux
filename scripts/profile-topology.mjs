/** Wide topology algorithm benchmark. Hashes prove geometry and ordering stay identical. */
import { layoutTopology } from "../dist/ui/topology/layout.js";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
const results = [];
for (const count of (process.env.PERF_ROWS ?? "1000,10000,50000")
  .split(",")
  .map(Number)) {
  for (const shape of ["star", "balanced"]) {
    const nodes = Array.from({ length: count }, (_, i) => ({
      id: String(i),
      parentId:
        i === 0
          ? null
          : shape === "star"
            ? "0"
            : String(Math.floor((i - 1) / 10)),
      label: `Sample ${i}`,
      cluster: "sample",
      data: null,
    }));
    const times = [],
      hashes = [];
    for (let i = 0; i < Number(process.env.PERF_REPEATS ?? 3); i++) {
      const start = performance.now();
      const result = layoutTopology(nodes);
      times.push(performance.now() - start);
      hashes.push(
        createHash("sha256").update(JSON.stringify(result)).digest("hex"),
      );
      if (result.nodes.length !== count) throw Error("Missing nodes");
    }
    const result = { count, shape, times, hashes };
    results.push(result);
    console.log(JSON.stringify(result));
  }
}
await writeFile(
  process.argv[2] ?? "/tmp/glass-topology.json",
  JSON.stringify(results, null, 2),
);
