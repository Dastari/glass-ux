import { expect, test } from "@playwright/test";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const CHARTS = [
  "line-chart",
  "area-chart",
  "bar-chart",
  "column-chart",
  "pie-chart",
  "donut-chart",
  "gauge",
  "radial-bar",
  "heatmap",
  "scatter-chart",
  "histogram",
  "treemap",
  "sunburst",
];

for (const id of CHARTS) {
  test(`${id}: Copy as CSV sits in the head's corner and copies the table`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`./components/${id}`);
    const chart = page.getByTestId(`chart-${id}`).locator(".fa-chart");
    await expect(chart).toHaveAttribute("data-tier", "full");
    const head = chart.locator(".fa-chart-head");
    const view = head.getByRole("button", { name: "View as table" });
    const copy = head.getByRole("button", { name: "Copy as CSV" });
    await expect(view).toBeVisible();
    await expect(copy).toBeVisible();
    const headBox = (await head.boundingBox())!;
    const viewBox = (await view.boundingBox())!;
    const copyBox = (await copy.boundingBox())!;
    // Same size as the table toggle, after it, flush with the head's inline end.
    expect(Math.abs(copyBox.width - viewBox.width)).toBeLessThan(0.5);
    expect(Math.abs(copyBox.height - viewBox.height)).toBeLessThan(0.5);
    expect(copyBox.x).toBeGreaterThan(viewBox.x + viewBox.width - 0.5);
    expect(Math.abs(copyBox.x + copyBox.width - (headBox.x + headBox.width))).toBeLessThan(1);
    expect(Math.abs(copyBox.y - viewBox.y)).toBeLessThan(0.5);

    await copy.click();
    const csv = await page.evaluate(() => navigator.clipboard.readText());
    const records = csv.split("\r\n");
    // The header matches the visible table's column headers.
    await view.click();
    const headers = await chart
      .locator("table[data-chart-table='visible'] thead th")
      .allInnerTexts();
    expect(records[0]).toBe(
      headers
        .map((text) => (/[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text))
        .join(","),
    );
    const bodyRows = await chart.locator("table[data-chart-table='visible'] tbody tr").count();
    expect(records).toHaveLength(bodyRows + 1);
  });
}

test("the head's tools keep their place from loading to loaded, and explain the disabled copy", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./components/line-chart");
  const slot = page.getByTestId("line-chart-full-slot");
  const copy = slot.getByRole("button", { name: "Copy as CSV" });
  const view = slot.getByRole("button", { name: "View as table" });
  await expect(copy).toHaveAttribute("aria-disabled", "true");
  await expect(copy).toHaveAccessibleDescription("The data is still loading");
  // Positions within the chart's own box: the page may scroll when the swap is pressed.
  const place = async () => {
    const origin = (await slot.boundingBox())!;
    return [copy, view].map(async (button) => {
      const box = (await button.boundingBox())!;
      return [box.x - origin.x, box.y - origin.y, box.width, box.height];
    });
  };
  const loading = await Promise.all(await place());
  await page.getByTestId("line-chart-full-swap").click();
  await expect(slot.locator(".fa-chart")).toHaveAttribute("data-state", "ready");
  await expect(copy).not.toHaveAttribute("aria-disabled", "true");
  const ready = await Promise.all(await place());
  expect(ready).toEqual(loading);
});
