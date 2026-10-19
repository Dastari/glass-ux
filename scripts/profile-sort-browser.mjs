/** Browser CPU-throttled localPage sorting; compare matched fixture builds. */
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch();
const results = [];
for (const count of [10000, 100000])
  for (const rate of [1, 4]) {
    for (const [variant, url] of [
      ["before", "http://127.0.0.1:4266"],
      ["after", "http://127.0.0.1:4267"],
    ]) {
      const page = await browser.newPage();
      const client = await page.context().newCDPSession(page);
      await client.send("Emulation.setCPUThrottlingRate", { rate });
      await page.goto(`${url}/?rows=${count}`);
      await page.waitForFunction(() => window.__ready);
      for (const numeric of [false, true]) {
        const result = {
          variant,
          count,
          rate,
          numeric,
          ...(await page.evaluate(
            (numeric) => window.__fixture.sort(numeric),
            numeric,
          )),
        };
        console.log(JSON.stringify(result));
        results.push(result);
      }
      await writeFile(
        process.argv[2] ?? "/tmp/glass-browser-sort.json",
        JSON.stringify(results, null, 2),
      );
      await page.close();
    }
  }
await browser.close();
