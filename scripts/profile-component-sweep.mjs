/** Audit untouched large components. Build with PERF_ENTRY=sweep.html, serve on 4264. */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const directory = process.argv[2] ?? "/tmp/glass-component-sweep";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const results = [];
const cases = process.env.PERF_CASES?.split(",") ?? [
  "line:10000",
  "line:100000",
  "scatter:10000",
  "topology:1000",
  "command:1000",
  "command:10000",
  "combobox:1000",
  "combobox:10000",
  "multi-select:1000",
  "rich-text:1000",
  "conversation:1000",
  "feed:1000",
];
for (const item of cases)
  for (const rate of (process.env.PERF_CPU ?? "1,4").split(",").map(Number)) {
    const [kind, count] = item.split(":");
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.on("pageerror", (e) => console.error("PAGE ERROR", item, e.message));
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate });
    await client.send("Performance.enable");
    await page.addInitScript(() => {
      window.__rectReads = 0;
      const rect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function () {
        window.__rectReads++;
        return rect.call(this);
      };
    });
    const began = performance.now();
    await page.goto(
      `${process.env.GLASS_UX_TEST_URL ?? "http://127.0.0.1:4264"}/sweep.html?kind=${kind}&rows=${count}`,
    );
    await page.waitForFunction(() => window.__ready);
    if (["line", "scatter"].includes(kind))
      await page.locator(".fa-chart-hit").waitFor();
    if (kind === "topology") await page.locator(".fa-topology-world").waitFor();
    if (kind === "rich-text")
      await page.locator('[contenteditable="true"]').waitFor();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const mountMs = performance.now() - began;
    const initial = Object.fromEntries(
      (await client.send("Performance.getMetrics")).metrics.map((m) => [
        m.name,
        m.value,
      ]),
    );
    const nodes = await page.evaluate(() => ({
      elements: document.querySelectorAll("*").length,
      tableRows: document.querySelectorAll("[data-chart-table] tbody tr")
        .length,
      circles: document.querySelectorAll("circle").length,
      options: document.querySelectorAll('[role="option"]').length,
      rectReads: window.__rectReads,
    }));
    await page.evaluate(() => {
      window.__rectReads = 0;
    });
    const input = performance.now();
    if (["combobox", "multi-select"].includes(kind)) {
      await page.getByRole("combobox", { name: "Samples" }).click();
      await page.getByRole("option").first().waitFor();
    } else if (kind === "command") {
      await page
        .getByRole("combobox", { name: "Search commands" })
        .fill("Command 99");
    } else if (kind === "conversation") {
      await page.evaluate(() => window.__append());
    } else if (["line", "scatter"].includes(kind)) {
      const box = await page.locator(".fa-chart-hit").boundingBox();
      for (let i = 0; i < 60; i++)
        await page.mouse.move(
          box.x + box.width * (0.1 + (0.8 * i) / 60),
          box.y + box.height * (0.5 + 0.3 * Math.sin(i / 5)),
        );
    }
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const inputMs = performance.now() - input;
    const metrics = Object.fromEntries(
      (await client.send("Performance.getMetrics")).metrics.map((m) => [
        m.name,
        m.value,
      ]),
    );
    const result = {
      kind,
      count: Number(count),
      rate,
      mountMs,
      ...nodes,
      inputMs,
      after: await page.evaluate(() => ({
        options: document.querySelectorAll('[role="option"]').length,
        rectReads: window.__rectReads,
      })),
      mountLayoutMs: initial.LayoutDuration * 1000,
      mountStyleMs: initial.RecalcStyleDuration * 1000,
      mountLayouts: initial.LayoutCount,
      interactionScriptMs:
        (metrics.ScriptDuration - initial.ScriptDuration) * 1000,
      interactionLayoutMs:
        (metrics.LayoutDuration - initial.LayoutDuration) * 1000,
      heapMB: metrics.JSHeapUsedSize / 1048576,
    };
    console.log(JSON.stringify(result));
    results.push(result);
    await writeFile(
      `${directory}/results.json`,
      JSON.stringify(results, null, 2),
    );
    await page.close();
  }
await browser.close();
