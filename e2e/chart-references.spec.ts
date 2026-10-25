import { expect, test } from "@playwright/test";

/*
 * Chart references: thresholds, bands and markers. Labels sit inside the plot without
 * colliding, and every reference is in the description and under the table; markers add an
 * Event column to the CSV.
 */

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/components/line-chart");
  await expect(page.getByTestId("chart-references").locator(".fa-chart-line").first()).toBeAttached({ timeout: 30_000 });
});

const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test("threshold labels sit inside the plot, apart, and the lines take their tone", async ({ page }) => {
  for (const id of ["chart-references", "chart-references-neutral"]) {
    const chart = page.getByTestId(id);
    await chart.scrollIntoViewIfNeeded();
    const svg = (await chart.locator(".fa-chart-svg").boundingBox())!;
    const labels = chart.locator(".fa-chart-threshold-label");
    await expect(labels).toHaveCount(2);
    const boxes = await Promise.all((await labels.all()).map((label) => label.boundingBox()));
    for (const box of boxes) {
      expect(box!.x).toBeGreaterThanOrEqual(svg.x - 0.5);
      expect(box!.x + box!.width).toBeLessThanOrEqual(svg.x + svg.width + 0.5);
      expect(box!.y).toBeGreaterThanOrEqual(svg.y - 0.5);
      expect(box!.y + box!.height).toBeLessThanOrEqual(svg.y + svg.height + 0.5);
    }
    expect(overlap(boxes[0]!, boxes[1]!)).toBe(false);
    // None of them covers the x axis labels.
    for (const tick of await chart.locator(".fa-chart-tick[data-axis='x']").all()) {
      const box = (await tick.boundingBox())!;
      for (const label of boxes) expect(overlap(box, label!)).toBe(false);
    }
  }
  const warning = page.getByTestId("chart-references").locator(".fa-chart-threshold[data-tone='warning']");
  const neutral = page.getByTestId("chart-references-neutral").locator(".fa-chart-threshold[data-tone='neutral']");
  const stroke = (locator: typeof warning) => locator.first().evaluate((line) => getComputedStyle(line).stroke);
  expect(await stroke(warning)).not.toBe(await stroke(neutral));
  // The dashed average.
  const dashed = page.getByTestId("chart-references-neutral").locator(".fa-chart-threshold[data-dashed]");
  await expect(dashed).toHaveCount(1);
  expect(await dashed.evaluate((line) => getComputedStyle(line).strokeDasharray)).not.toBe("none");
  // The explicit band replaces the shading status thresholds would imply, and is labelled.
  await expect(page.getByTestId("chart-references-neutral").locator(".fa-chart-band")).toHaveCount(1);
  await expect(page.getByTestId("chart-references-neutral").locator(".fa-chart-band-label")).toHaveText("Normal range");
  await expect(page.getByTestId("chart-references").locator(".fa-chart-band")).toHaveCount(2);
});

test("marker labels never overlap; the tooltip names the event", async ({ page }) => {
  const chart = page.getByTestId("chart-references");
  await chart.scrollIntoViewIfNeeded();
  await expect(chart.locator(".fa-chart-marker")).toHaveCount(3);
  const labels = await Promise.all((await chart.locator(".fa-chart-marker-label").all()).map((label) => label.boundingBox()));
  expect(labels.length).toBeGreaterThan(0);
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) expect(overlap(labels[i]!, labels[j]!)).toBe(false);
  const rule = (await chart.locator(".fa-chart-marker-rule").nth(1).boundingBox())!;
  const svg = (await chart.locator(".fa-chart-svg").boundingBox())!;
  await page.mouse.move(rule.x + rule.width / 2, svg.y + svg.height / 2);
  const tooltip = page.locator(".fa-chart-tip").filter({ visible: true }).first();
  await expect(tooltip).toContainText("Incident · Queue backlog");
});

test("references are described, noted under the table and events are a CSV column", async ({ page }) => {
  const chart = page.getByTestId("chart-references");
  const figure = chart.locator("figure");
  const describedBy = (await figure.getAttribute("aria-describedby"))!;
  const note = page.locator(`[id="${describedBy.split(" ").pop()}"]`);
  await expect(note).toContainText("Reference lines: Warning at 70% and Critical at 90%.");
  await expect(note).toContainText("Events: Deploy 4.2.0 (Build runner image) at");
  await chart.scrollIntoViewIfNeeded();
  await figure.getByRole("button", { name: "View as table" }).click();
  await expect(chart.locator(".fa-chart-table-notes")).toContainText("Reference lines: Warning at 70% and Critical at 90%.");
  await expect(chart.locator("table[data-chart-table='visible'] thead th").last()).toHaveText("Event");
  await expect(chart.locator("table[data-chart-table='visible'] tbody")).toContainText("Incident (Queue backlog)");
  await figure.getByRole("button", { name: "Copy as CSV" }).click();
  const csv = await page.evaluate(() => navigator.clipboard.readText());
  const records = csv.split("\r\n");
  expect(records[0]!.endsWith(",Event")).toBe(true);
  expect(records.filter((record) => record.endsWith(",Incident (Queue backlog)"))).toHaveLength(1);
  expect(csv).not.toContain("Reference lines");
});

test("columns and scatter draw their thresholds and bands @responsive", async ({ page }) => {
  await page.goto("/components/column-chart");
  const columns = page.getByTestId("chart-column-references");
  await expect(columns.locator(".fa-chart-threshold[data-dashed]")).toHaveCount(1);
  await expect(columns.locator(".fa-chart-band")).toHaveCount(1);
  await page.goto("/components/scatter-chart");
  const scatter = page.getByTestId("chart-scatter-references");
  await expect(scatter.locator(".fa-chart-threshold[data-tone='warning']")).toHaveCount(1);
  await expect(scatter.locator(".fa-chart-band")).toHaveCount(1);
});
