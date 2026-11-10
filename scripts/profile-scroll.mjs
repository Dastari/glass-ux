/**
 * Scrolling cost of a built docs page. Build the docs with GLASS_UX_BASE=/glass-ux/ first.
 *   node scripts/profile-scroll.mjs [path] [variants] [repeats]
 *   node scripts/profile-scroll.mjs /components/data-table/ "live;none;solid" 3
 * Serves apps/docs/dist at /glass-ux/ on PERF_PORT (default 4391) unless GLASS_UX_TEST_URL names
 * a running site. For each variant (live blur, none, solid) it wheels the pointer over the page
 * 90 times and traces it: main-thread busy time and its parts (ms per second), compositor and
 * display-compositor busy time, frames per second, draw time per frame, scroll events handled
 * and the CSS transitions that started. PERF_CSS injects a rule, PERF_ARGS passes Chromium
 * flags, PERF_AT=x,y moves the pointer and PERF_VIEWPORT=WxH sets the size (1920x1080).
 * Headless Chromium renders in software, which makes blur dearer than a GPU does: compare
 * rows of one run, not absolute times; main-thread figures vary by about ±15%.
 */
import { chromium } from "@playwright/test";
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const [route = "/components/data-table/", variants = "live;none;solid", repeats = "1"] = process.argv.slice(2);
const port = Number(process.env.PERF_PORT ?? 4391);
const root = path.resolve("apps/docs/dist");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".txt": "text/plain" };

let server;
let base = process.env.GLASS_UX_TEST_URL;
if (!base) {
  server = http.createServer(async (request, response) => {
    try {
      const url = decodeURIComponent(new URL(request.url, "http://local").pathname);
      if (!url.startsWith("/glass-ux/")) throw new Error("outside");
      let file = path.join(root, url.slice("/glass-ux/".length));
      if (!file.startsWith(root)) throw new Error("outside");
      try {
        if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
      } catch {
        file = path.join(root, "index.html"); // client-side route
      }
      response.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${port}/glass-ux`;
}

const [width, height] = (process.env.PERF_VIEWPORT ?? "1920x1080").split("x").map(Number);
const browser = await chromium.launch({ args: (process.env.PERF_ARGS ?? "").split(" ").filter(Boolean) });
const MAIN_PARTS = ["HitTest", "Layerize", "PrePaint", "UpdateLayoutTree", "Layout", "Paint", "Commit", "EventDispatch", "FunctionCall", "FireAnimationFrame", "ResizeObserverController::deliverObservations", "IntersectionObserverController::computeIntersections"];

/** Busy time of each thread of interest: the union of its complete events, so nested slices count once. */
function analyse(trace, seconds) {
  const names = new Map();
  for (const e of trace.traceEvents) if (e.ph === "M" && e.name === "thread_name") names.set(`${e.pid}:${e.tid}`, e.args.name);
  const spans = new Map();
  const parts = {};
  for (const e of trace.traceEvents) {
    if (e.ph !== "X" || !e.dur) continue;
    const thread = names.get(`${e.pid}:${e.tid}`);
    if (!thread || !/^(CrRendererMain|Compositor|VizCompositorThread)$/.test(thread)) continue;
    if (!spans.has(thread)) spans.set(thread, []);
    spans.get(thread).push([e.ts, e.ts + e.dur]);
    if (thread === "CrRendererMain" && MAIN_PARTS.includes(e.name)) parts[e.name] = (parts[e.name] ?? 0) + e.dur;
  }
  const perSecond = (us) => Math.round(us / 1000 / seconds);
  const result = {};
  for (const [thread, list] of spans) {
    list.sort((a, b) => a[0] - b[0]);
    let total = 0;
    let [start, end] = list[0];
    for (const [a, b] of list.slice(1)) {
      if (a > end) {
        total += end - start;
        [start, end] = [a, b];
      } else end = Math.max(end, b);
    }
    total += end - start;
    result[{ CrRendererMain: "main", Compositor: "compositor", VizCompositorThread: "display" }[thread]] = perSecond(total);
  }
  result.parts = Object.fromEntries(
    Object.entries(parts)
      .map(([name, us]) => [name.replace(/Controller::.*/, ""), perSecond(us)])
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]),
  );
  const draws = trace.traceEvents.filter((e) => e.ph === "X" && e.name === "DirectRenderer::DrawFrame");
  result.fps = Math.round(draws.length / seconds);
  result.drawMs = draws.length ? +(draws.reduce((sum, e) => sum + e.dur, 0) / 1000 / draws.length).toFixed(1) : 0;
  return result;
}

for (const variant of variants.split(";")) {
  for (let run = 0; run < Number(repeats); run++) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.addInitScript((v) => {
      localStorage.setItem(
        "glass-ux.appearance.v1",
        JSON.stringify({ mode: "light", motion: "reduced", glassRendering: v === "none" ? "none" : "live", glass: v === "solid" ? "solid" : "full" }),
      );
      // The documentation skips far blocks for people; under automation only with this key.
      localStorage.setItem("docs-kit.far-blocks", "on");
      // Counted in the page: scroll events handled and transitions that started while scrolling.
      window.__perf = { scrolls: 0, transitions: 0, counting: false };
      addEventListener("scroll", () => window.__perf.counting && window.__perf.scrolls++, { capture: true, passive: true });
      addEventListener("transitionstart", () => window.__perf.counting && window.__perf.transitions++, { capture: true });
    }, variant);
    await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    if (process.env.PERF_CSS) await page.addStyleTag({ content: process.env.PERF_CSS });
    await page.waitForTimeout(1500);
    const nodes = await page.evaluate(() => document.querySelectorAll("*").length);
    const [x, y] = (process.env.PERF_AT ?? `${Math.round(width * 0.57)},${Math.round(height * 0.55)}`).split(",").map(Number);
    await page.mouse.move(x, y);
    await page.evaluate(() => (window.__perf.counting = true));
    await browser.startTracing(page, { categories: ["devtools.timeline", "viz", "cc", "toplevel"] });
    const started = Date.now();
    for (let step = 0; step < 90; step++) {
      await page.mouse.wheel(0, step < 60 ? 80 : -80);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(300);
    const seconds = (Date.now() - started) / 1000;
    const trace = JSON.parse((await browser.stopTracing()).toString());
    const counted = await page.evaluate(() => window.__perf);
    console.log(JSON.stringify({ route, variant, run, nodes, scrollEvents: counted.scrolls, transitions: counted.transitions, ...analyse(trace, seconds) }));
    await page.close();
  }
}
await browser.close();
server?.close();
