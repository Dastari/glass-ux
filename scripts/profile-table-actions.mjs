/** Relative interaction timings and renderer counts against matched fixture builds. */
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch();
const results = [];
const paint = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
for (const [variant, url] of [
  ["before", "http://127.0.0.1:4266"],
  ["after", "http://127.0.0.1:4267"],
]) {
  for (const count of [1000, 100000]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto(`${url}/?rows=${count}&reorder=1&glass=full`);
    await page.locator('[data-row-id="0"]').waitFor();
    await paint(page);
    const measure = async (action, run) => {
      await page.evaluate(() => {
        window.__perf.cells = 0;
        window.__perf.keys = 0;
      });
      const start = performance.now();
      await run();
      await paint(page);
      const result = {
        variant,
        count,
        action,
        ms: performance.now() - start,
        ...(await page.evaluate(() => window.__perf)),
      };
      console.log(JSON.stringify(result));
      results.push(result);
    };
    await measure("one live row", () =>
      page.evaluate(() => window.__fixture.update()),
    );
    await measure("select one", () =>
      page
        .getByRole("checkbox", { name: "Select Sample 0", exact: true })
        .click(),
    );
    const grip = page.getByRole("button", {
      name: "Reorder Sample 0",
      exact: true,
    });
    await grip.focus();
    await measure("keyboard reorder", async () => {
      await grip.press("Space");
      await grip.press("ArrowDown");
      await grip.press("Space");
    });
    await measure("resize gesture", async () => {
      const handle = page.getByRole("separator", {
        name: "Resize Name column",
      });
      const box = await handle.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width / 2 + 100,
        box.y + box.height / 2,
        { steps: 30 },
      );
      await page.mouse.up();
    });
    await page.locator(".fa-dt-scroll").evaluate((element) => {
      element.scrollTop = 600;
    });
    await paint(page);
    const before = await page.locator('[data-row-id="15"]').boundingBox();
    await measure("held arrival", () =>
      page.evaluate(() => window.__fixture.add()),
    );
    const after = await page.locator('[data-row-id="15"]').boundingBox();
    if (
      Math.abs(before.y - after.y) > 0.5 ||
      (await page
        .getByRole("button", { name: "1 new", exact: true })
        .count()) !== 1
    )
      throw Error("Held arrival moved the reader's rows");
    await page.close();
  }
}
await writeFile(
  process.argv[2] ?? "/tmp/glass-table-actions.json",
  JSON.stringify(results, null, 2),
);
await browser.close();
