/** Main-thread costs for the 0.9.9 performance table. Build the fixtures
 * (PERF_ENTRY=index.html,shell.html,hydrate.html), serve them on 4265, then:
 *   node scripts/profile-interactions.mjs label [/tmp/glass-interactions]
 * Reports, at 4x CPU throttle: 300-button mount (commit ms), DataTable sort and filter
 * interaction latency (Event Timing, the INP measure) and hydration long tasks.
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const [label = "profile", directory = "/tmp/glass-interactions"] =
  process.argv.slice(2);
await mkdir(directory, { recursive: true });
const base = process.env.GLASS_UX_TEST_URL ?? "http://127.0.0.1:4265";
const repeats = Number(process.env.PERF_REPEATS ?? 5);
const rate = Number(process.env.PERF_CPU ?? 4);
const browser = await chromium.launch({
  channel: process.env.PERF_CHANNEL ?? "chromium",
});
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) / 2)];
const results = {};
const record = (name, values) => {
  results[name] = { median: median(values), values };
  console.log(
    name.padEnd(28),
    "median",
    String(median(values)).padStart(5),
    JSON.stringify(values),
  );
};

async function open(url) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => console.error("PAGE ERROR", url, e.message));
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate });
  await page.goto(`${base}/${url}`);
  await page.waitForFunction(() => window.__ready);
  return page;
}
const settle = (page) =>
  page.evaluate(
    () =>
      new Promise((r) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTimeout(r, 100)),
        ),
      ),
  );

/** The slowest Event Timing entry of the interactions `run` causes (INP counts the worst). */
async function interaction(page, run) {
  await page.evaluate(() => {
    window.__events = [];
    new PerformanceObserver((list) =>
      window.__events.push(
        ...list
          .getEntries()
          .filter((e) => e.interactionId)
          .map((e) => e.duration),
      ),
    ).observe({ type: "event", durationThreshold: 16, buffered: false });
  });
  await run();
  await settle(page);
  await page.waitForTimeout(300);
  return page.evaluate(() => Math.max(0, ...window.__events));
}

const mount = [];
for (let i = 0; i < repeats; i += 1) {
  const page = await open("shell.html?buttons=300");
  mount.push(Math.round(await page.evaluate(() => window.__mount())));
  await page.close();
}
record("mount 300 buttons (ms)", mount);

const sort = [];
const filter = [];
for (let i = 0; i < repeats; i += 1) {
  const page = await open("index.html?rows=1000&sortable");
  await page.locator('[data-row-id="0"]').waitFor();
  await settle(page);
  const header = page.locator(
    '[role="columnheader"][data-col="name"] button.fa-dt-th-button',
  );
  sort.push(await interaction(page, () => header.click()));
  await settle(page);
  const input = page.getByRole("textbox", { name: "Filter samples" });
  await input.focus();
  filter.push(
    await interaction(page, () =>
      input.pressSequentially("Sample 12", { delay: 30 }),
    ),
  );
  await page.close();
}
record("table sort INP (ms)", sort);
record("table filter INP (ms)", filter);

for (const variant of ["", "?stored=1"]) {
  const tasks = [];
  const total = [];
  const renders = [];
  for (let i = 0; i < repeats; i += 1) {
    const page = await open(`hydrate.html${variant}`);
    const h = await page.evaluate(() => window.__hydration);
    tasks.push(Math.max(0, ...h.longTasks));
    total.push(h.longTasks.reduce((a, b) => a + b, 0));
    renders.push(h.consumerRenders);
    await page.close();
  }
  record(`hydrate${variant} longest task`, tasks);
  record(`hydrate${variant} long-task sum`, total);
  record(`hydrate${variant} consumer renders`, renders);
}
await writeFile(`${directory}/${label}.json`, JSON.stringify(results, null, 2));
await browser.close();
