import { expect, test } from "@playwright/test";

/*
 * Marks are drawn from the `d` attribute and, where the engine has it, morph through the CSS `d`
 * property. Safari has no CSS `d`, so a mark that carried its path only there drew nothing.
 */

const MARKS = ".fa-chart-bar, .fa-chart-arc, .fa-chart-line, .fa-chart-area, .fa-chart-cell, .fa-chart-sankey-link, .fa-chart-funnel-link, .fa-chart-radar-area, .fa-chart-tile";
const PAGES = [
  "line-chart",
  "area-chart",
  "bar-chart",
  "column-chart",
  "combo-chart",
  "funnel-chart",
  "radar-chart",
  "sankey-chart",
  "pie-chart",
  "donut-chart",
  "gauge",
  "radial-bar",
  "heatmap",
  "treemap",
  "sunburst",
];

for (const id of PAGES) {
  test(`${id}: every mark has a shape that draws`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced" })));
    await page.goto(`/components/${id}`);
    const pane = page.getByTestId(`chart-${id}`);
    await pane.scrollIntoViewIfNeeded();
    await expect(pane.locator(".fa-chart")).toHaveAttribute("data-state", "ready");
    const marks = pane.locator(".fa-chart-svg").first().locator(MARKS);
    expect(await marks.count()).toBeGreaterThan(0);
    const empty = await marks.evaluateAll((paths) =>
      paths.filter((path) => {
        const box = (path as SVGGraphicsElement).getBBox();
        return box.width === 0 && box.height === 0;
      }).length,
    );
    expect(empty).toBe(0);
  });
}
