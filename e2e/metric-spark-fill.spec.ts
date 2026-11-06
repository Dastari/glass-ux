import { expect, test } from "@playwright/test";

/** Metric's sparklineFill, measured in the micro tier under the theme's density, scale and line weight. */
const PRESETS = [
  { name: "default", density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1, mode: "light" },
  { name: "dense large", density: "compact", uiScale: 1.25, radiusScale: 0, borderWidth: 2, mode: "dark" },
  { name: "dense small", density: "compact", uiScale: 0.875, radiusScale: 1.5, borderWidth: 0.5, glass: "solid" },
] as const;

for (const preset of PRESETS) {
  test(`the micro sparkline takes the rest of the row: ${preset.name} @responsive`, async ({ page }) => {
    await page.addInitScript((settings) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(settings)), {
      ...preset,
      motion: "reduced",
    });
    await page.goto("/components/metric");
    await expect(page.locator("html")).toHaveAttribute("data-density", preset.density);
    const rows = page.getByTestId("metric-spark-fill").locator(".fa-metric");
    await expect(rows).toHaveCount(3);
    await rows.first().scrollIntoViewIfNeeded();
    for (let index = 0; index < 3; index++) {
      const box = await rows.nth(index).evaluate((root) => {
        const body = root.querySelector(".fa-metric-body")!;
        const figure = root.querySelector(".fa-metric-figure")!.getBoundingClientRect();
        const head = root.querySelector(".fa-metric-head")!.getBoundingClientRect();
        const chart = root.querySelector(".fa-metric-chart")!.getBoundingClientRect();
        const rootBox = root.getBoundingClientRect();
        return {
          tier: getComputedStyle(body).getPropertyValue("--fa-metric-tier").trim(),
          gap: Number.parseFloat(getComputedStyle(body).columnGap),
          figureLeft: figure.left,
          figureRight: figure.right,
          headLeft: head.left,
          headRight: head.right,
          chartLeft: chart.left,
          chartRight: chart.right,
          chartHeight: chart.height,
          rootLeft: rootBox.left,
          rootRight: rootBox.right,
          rootWidth: rootBox.width,
        };
      });
      expect(box.tier).toBe("micro");
      // It starts one gap after the figure and ends at the row's end, on either reading side.
      expect(Math.abs(box.chartRight - box.rootRight)).toBeLessThan(1);
      expect(box.chartLeft).toBeGreaterThanOrEqual(box.figureRight);
      expect(Math.abs(box.chartLeft - box.figureRight - box.gap)).toBeLessThan(1);
      expect(box.chartHeight).toBeGreaterThan(0);
    }
    const widths = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(widths[0]).toBeLessThanOrEqual(widths[1]!);
  });
}

test("without the prop the micro sparkline stops at its usual width", async ({ page }) => {
  await page.goto("/components/metric");
  const row = page.getByRole("group", { name: "CPU" }).filter({ has: page.locator(".fa-metric-body:not([data-sparkline])") });
  const plain = page.locator(".flex.h-12 .fa-metric .fa-metric-body:not([data-sparkline])").first();
  await plain.scrollIntoViewIfNeeded();
  await expect(row.first()).toBeVisible();
  const { chart, rem } = await plain.evaluate((body) => ({
    chart: body.querySelector(".fa-metric-chart")!.getBoundingClientRect().width,
    rem: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
  }));
  expect(chart).toBeLessThanOrEqual(8 * rem + 0.5);
});

test("the skeleton's chart takes the same box as the loaded one @responsive", async ({ page }) => {
  await page.goto("/components/metric");
  const rows = page.getByTestId("metric-spark-fill").locator(".fa-metric");
  await rows.last().scrollIntoViewIfNeeded();
  const chart = (index: number) => rows.nth(index).locator(".fa-metric-chart").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { right: box.right, height: box.height };
  });
  const [loaded, skeleton] = [await chart(0), await chart(2)];
  expect(Math.abs(loaded.right - skeleton.right)).toBeLessThan(1);
  expect(Math.abs(loaded.height - skeleton.height)).toBeLessThan(1);
});
