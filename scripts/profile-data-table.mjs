/** Production stress fixture. pnpm build && node scripts/performance/build.mjs
 * Serve .handoff/performance-dist on 4261, then:
 * PERF_ROWS=1000,10000,100000 PERF_CPU=1,4 PERF_GLASS=full,solid PERF_REPEATS=3
 * node scripts/profile-data-table.mjs before /tmp/glass-table-perf
 * Raw traces and results deliberately remain outside the repository.
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const [label = "profile", directory = "/tmp/glass-table-perf"] =
  process.argv.slice(2);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const system = await browser.newBrowserCDPSession();
await writeFile(
  `${directory}/${label}-environment.json`,
  JSON.stringify(
    {
      version: browser.version(),
      ...(await system.send("SystemInfo.getInfo")),
    },
    null,
    2,
  ),
);
const results = [];
const quantile = (values, p) =>
  [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)] ?? 0;
const list = (name, fallback) => (process.env[name] ?? fallback).split(",");
const targets = list(
  "PERF_TARGETS",
  `${label}@${process.env.GLASS_UX_TEST_URL ?? "http://127.0.0.1:4261"}`,
).map((target) => {
  const [name, url] = target.split("@");
  return { name, url };
});
for (const kind of list("PERF_KINDS", "table,tree"))
  for (const rows of list("PERF_ROWS", "1000,10000,100000").map(Number))
    for (const glass of list("PERF_GLASS", "full,solid"))
      for (const rate of list("PERF_CPU", "1,4").map(Number))
        for (
          let repeat = 0;
          repeat < Number(process.env.PERF_REPEATS ?? 3);
          repeat++
        )
          for (const target of repeat % 2 ? targets.toReversed() : targets) {
            const page = await browser.newPage({
              viewport: {
                width: Number(process.env.PERF_WIDTH ?? 1440),
                height: 900,
              },
            });
            page.on("pageerror", (error) =>
              console.error("PAGE ERROR", error.message),
            );
            await page.addInitScript(() => {
              window.__perf = { keys: 0, cells: 0 };
            });
            const client = await page.context().newCDPSession(page);
            await client.send("Emulation.setCPUThrottlingRate", { rate });
            const start = performance.now();
            await page.goto(
              `${target.url}/?kind=${kind}&rows=${rows}&glass=${glass}${process.env.PERF_WIDE ? "&wide=1" : ""}${process.env.PERF_GROUPED ? "&grouped=1" : ""}`,
            );
            await page.waitForFunction(
              () =>
                window.__ready &&
                document.querySelector(
                  ".fa-dt-row[data-row-id],.fa-tree-row[data-row-id]",
                ),
            );
            const mountMs = performance.now() - start;
            await page.waitForTimeout(250);
            const scroller = page.locator(
              kind === "table" ? ".fa-dt-scroll" : ".fa-tree-scroll",
            );
            await scroller.hover();
            await client.send("HeapProfiler.collectGarbage");
            const memoryBefore = await client.send("Runtime.getHeapUsage");
            await client.send("Tracing.start", {
              categories:
                "devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline.frame,toplevel",
              transferMode: "ReturnAsStream",
            });
            await page.evaluate(() => {
              window.__perf.keys = 0;
              window.__perf.cells = 0;
              window.__frames = [];
              window.__record = true;
              const tick = (time) => {
                if (!window.__record) return;
                window.__frames.push(time);
                requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
              performance.mark("perf-start");
            });
            // Real wheel input at a fixed cadence, including the compositor's native scroll path.
            const began = performance.now();
            for (let i = 1; i <= 90; i++) {
              await page.mouse.wheel(0, 60);
              await new Promise((resolve) =>
                setTimeout(
                  resolve,
                  Math.max(0, began + (i * 1000) / 60 - performance.now()),
                ),
              );
            }
            await page.waitForTimeout(150);
            const sample = await page.evaluate(() => {
              performance.mark("perf-end");
              window.__record = false;
              return {
                frames: window.__frames,
                ...window.__perf,
                mounted: document.querySelectorAll("[data-row-id]").length,
                scrollTop: document.querySelector(
                  ".fa-dt-scroll,.fa-tree-scroll",
                ).scrollTop,
              };
            });
            const complete = new Promise((resolve) =>
              client.once("Tracing.tracingComplete", resolve),
            );
            await client.send("Tracing.end");
            const { stream } = await complete;
            let raw = "";
            for (;;) {
              const chunk = await client.send("IO.read", { handle: stream });
              raw += chunk.data;
              if (chunk.eof) break;
            }
            await client.send("IO.close", { handle: stream });
            const id = `${label}-${target.name}-${kind}-${rows}-${glass}-${rate}-${repeat}${process.env.PERF_WIDE ? "-wide" : ""}${process.env.PERF_GROUPED ? "-grouped" : ""}`;
            await writeFile(`${directory}/${id}.trace.json`, raw);
            const events = JSON.parse(raw).traceEvents;
            const first = events.find((e) => e.name === "perf-start");
            const last = events.find((e) => e.name === "perf-end");
            const main = events.filter(
              (e) =>
                e.ph === "X" &&
                e.pid === first.pid &&
                e.tid === first.tid &&
                e.ts >= first.ts &&
                e.ts < last.ts,
            );
            const sum = (names) =>
              main
                .filter((e) => names.includes(e.name))
                .reduce((s, e) => s + e.dur / 1000, 0);
            const intervals = main
              .filter((e) =>
                [
                  "FunctionCall",
                  "EventDispatch",
                  "FireAnimationFrame",
                ].includes(e.name),
              )
              .map((e) => [e.ts, e.ts + e.dur])
              .sort((a, b) => a[0] - b[0]);
            let union = 0,
              lo = 0,
              hi = 0;
            for (const [a, b] of intervals) {
              if (a > hi) {
                union += hi - lo;
                lo = a;
                hi = b;
              } else hi = Math.max(hi, b);
            }
            union += hi - lo;
            const renderInside = main
              .filter(
                (e) =>
                  [
                    "UpdateLayoutTree",
                    "Layout",
                    "PrePaint",
                    "Paint",
                    "Layerize",
                  ].includes(e.name) &&
                  intervals.some(([a, b]) => e.ts >= a && e.ts + e.dur <= b),
              )
              .reduce((s, e) => s + e.dur, 0);
            const frames = sample.frames
              .slice(1)
              .map((time, i) => time - sample.frames[i]);
            const duration = (last.ts - first.ts) / 1000;
            const dropped = frames.reduce(
              (s, time) => s + Math.max(0, Math.round(time / (1000 / 60)) - 1),
              0,
            );
            const memoryAfter = await client.send("Runtime.getHeapUsage");
            const sort = [];
            if (kind === "table" && process.env.PERF_SORT !== "0")
              for (let i = 0; i < 3; i++)
                sort.push(await page.evaluate(() => window.__fixture.sort()));
            // Input-to-two-rAF includes the synchronous filter/update and the next paint opportunity.
            const typing = [];
            if (kind === "table") {
              const input = page.getByRole("textbox", {
                name: "Filter samples",
              });
              for (const text of ["S", "Sa", "Sam"]) {
                const t = performance.now();
                await input.fill(text);
                await page.evaluate(
                  () =>
                    new Promise((resolve) =>
                      requestAnimationFrame(() =>
                        requestAnimationFrame(resolve),
                      ),
                    ),
                );
                typing.push(performance.now() - t);
              }
            }
            const result = {
              id,
              variant: target.name,
              kind,
              rows,
              glass,
              rate,
              repeat,
              mountMs,
              duration,
              fps: (frames.length / duration) * 1000,
              frameP95: quantile(frames, 0.95),
              dropped,
              keys: sample.keys,
              cells: sample.cells,
              mounted: sample.mounted,
              scrollTop: sample.scrollTop,
              styleMs: sum(["UpdateLayoutTree"]),
              layoutMs: sum(["Layout"]),
              paintMs: sum(["PrePaint", "Paint"]),
              scriptMs: (union - renderInside) / 1000,
              heapUsedMB: memoryBefore.usedSize / 1048576,
              heapEndMB: memoryAfter.usedSize / 1048576,
              sortMs: sort.map((s) => s.ms),
              inputMs: typing,
            };
            if (process.env.PERF_ASSERT === "1" && sample.keys > rows * 2)
              throw Error(
                `${id}: virtualizer revisited ${sample.keys} keys while scrolling ${rows} rows`,
              );
            results.push(result);
            console.log(JSON.stringify(result));
            await writeFile(
              `${directory}/${label}.json`,
              JSON.stringify(results, null, 2),
            );
            await page.close();
          }
await browser.close();
