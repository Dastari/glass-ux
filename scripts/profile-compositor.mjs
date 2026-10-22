/** Compositor cost at rest. Build the shell fixture (PERF_ENTRY=shell.html), serve it on 4265.
 *   node scripts/profile-compositor.mjs label "query1;query2" [/tmp/glass-compositor]
 * Each query is appended to shell.html?…; the page settles, then a 5s trace measures the busy
 * time (ms per second) of the compositor and GPU threads. Results stay outside the repository.
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const [label = "profile", queries = "", directory = "/tmp/glass-compositor"] =
  process.argv.slice(2);
await mkdir(directory, { recursive: true });
const base = process.env.GLASS_UX_TEST_URL ?? "http://127.0.0.1:4265";
const seconds = Number(process.env.PERF_SECONDS ?? 5);
const repeats = Number(process.env.PERF_REPEATS ?? 3);
const browser = await chromium.launch({
  channel: process.env.PERF_CHANNEL ?? "chromium",
  args: (process.env.PERF_ARGS ?? "").split(" ").filter(Boolean),
});
const THREADS =
  /^(VizCompositorThread|CrGpuMain|Compositor|CompositorGpuThread|CrRendererMain)$/;

/** Busy time per thread: the union of complete events, so nested slices count once. */
function busy(trace) {
  const names = new Map();
  for (const e of trace.traceEvents)
    if (e.ph === "M" && e.name === "thread_name")
      names.set(`${e.pid}:${e.tid}`, e.args.name);
  const spans = new Map();
  let first = Infinity;
  let last = 0;
  for (const e of trace.traceEvents) {
    if (e.ph !== "X" || !e.dur) continue;
    const name = names.get(`${e.pid}:${e.tid}`);
    if (!name || !THREADS.test(name)) continue;
    const key = name;
    if (!spans.has(key)) spans.set(key, []);
    spans.get(key).push([e.ts, e.ts + e.dur]);
    first = Math.min(first, e.ts);
    last = Math.max(last, e.ts + e.dur);
  }
  const result = {};
  for (const [key, list] of spans) {
    list.sort((a, b) => a[0] - b[0]);
    let total = 0;
    let [start, end] = list[0];
    for (const [s, e] of list.slice(1)) {
      if (s > end) {
        total += end - start;
        [start, end] = [s, e];
      } else end = Math.max(end, e);
    }
    total += end - start;
    result[key] = Math.round(total / 1000 / seconds);
  }
  // Frames the display compositor drew, and its mean cost per frame.
  const draws = trace.traceEvents.filter(
    (e) => e.ph === "X" && e.name === "DirectRenderer::DrawFrame",
  );
  result.frames = Math.round(draws.length / seconds);
  result.msPerFrame = draws.length
    ? +(draws.reduce((n, e) => n + e.dur, 0) / 1000 / draws.length).toFixed(2)
    : 0;
  return result;
}

const results = [];
for (const query of queries.split(";")) {
  for (let run = 0; run < repeats; run += 1) {
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });
    page.on("pageerror", (e) => console.error("PAGE ERROR", query, e.message));
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", {
      rate: Number(process.env.PERF_CPU ?? 4),
    });
    await page.goto(`${base}/shell.html?${query}`);
    await page.waitForFunction(() => window.__ready);
    // PERF_CSS: extra rules for trying a mitigation without rebuilding.
    if (process.env.PERF_CSS)
      await page.addStyleTag({ content: process.env.PERF_CSS });
    await page.mouse.move(5, 1075);
    await page.waitForTimeout(2000);
    await browser.startTracing(page, {
      categories: [
        "devtools.timeline",
        "disabled-by-default-devtools.timeline",
        "viz",
        "cc",
        "gpu",
        "toplevel",
      ],
    });
    await page.waitForTimeout(seconds * 1000);
    const trace = JSON.parse((await browser.stopTracing()).toString());
    const row = { label, query, run, ...busy(trace) };
    results.push(row);
    console.log(JSON.stringify(row));
    await page.close();
  }
}
await writeFile(`${directory}/${label}.json`, JSON.stringify(results, null, 2));
await browser.close();
