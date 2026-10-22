import type {} from "./runtime.js";
// A live line chart: window.__fixture.slide() moves the time window on one sample,
// window.__fixture.change() changes a value in place; window.__commits records each commit's
// rendering time under the chart (React Profiler).
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Profiler, useLayoutEffect, useState } from "react";
import { ChartTable, LineChart, type ChartTableModel } from "glass-ux/charts";
import "glass-ux/styles.css";

const START = Date.UTC(2026, 9, 1, 9);
const sample = (i: number) => 40 + 25 * Math.sin(i / 5) + ((i * 7) % 11);
const params = new URLSearchParams(location.search);
// points=N samples; part=table mounts only the chart's hidden data table, for its cost.
const points = Number(params.get("points") ?? 60);
const part = params.get("part") ?? "chart";
const window60 = (from: number) =>
  Array.from({ length: points }, (_, i) => from + i);
window.__commits = [];

function Live() {
  const [from, setFrom] = useState(0);
  const [bump, setBump] = useState(0);
  const indices = window60(from);
  const x = indices.map((i) => new Date(START + i * 60_000));
  const values = indices.map((i, k) => sample(i) + (k === 30 ? bump : 0));
  window.__fixture = {
    ...window.__fixture,
    slide: () => setFrom((f) => f + 1),
    change: () => setBump((b) => b + 20),
    timeSlide: () => {
      const start = performance.now();
      flushSync(() => setFrom((f) => f + 1));
      void document.body.offsetHeight;
      return performance.now() - start;
    },
  } as typeof window.__fixture;

  useLayoutEffect(() => {
    void document.body.offsetHeight;
    window.__mountMs = performance.now() - started;
    window.__ready = true;
  }, []);
  if (part === "none")
    return <ChartTable model={{ columns: [{ key: "x", label: "Time" }], rows: [{ x: "Sample" }] }} caption="Sample" />;
  if (part === "table") {
    const step = Math.max(1, Math.ceil(points / 500));
    const model: ChartTableModel = {
      columns: [
        { key: "x", label: step > 1 ? `Time (1 in ${step} samples)` : "Time" },
        { key: "a", label: "Sample", numeric: true },
      ],
      rows: x
        .filter((_, i) => i % step === 0)
        .map((d, i) => ({
          x: d.toLocaleTimeString(),
          a: `${values[i * step]!.toFixed(0)} ms`,
        })),
    };
    return <ChartTable model={model} caption="Sample throughput" />;
  }
  return (
    <Profiler
      id="chart"
      onRender={(_, phase, actual) =>
        window.__commits.push({ phase, ms: actual, at: performance.now() })
      }
    >
      <LineChart
        label="Sample throughput"
        title="Sample throughput"
        series={[{ key: "a", label: "Sample", data: values }]}
        x={x}
        unit="ms"
      />
    </Profiler>
  );
}

const started = performance.now();
createRoot(document.getElementById("root")!).render(<Live />);
