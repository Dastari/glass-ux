import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const appearance = (page: Page, uiScale = 1) =>
  page.addInitScript(
    (uiScale) =>
      localStorage.setItem(
        "glass-ux.appearance.v1",
        JSON.stringify({ uiScale, mode: "light", motion: "reduced" }),
      ),
    uiScale,
  );

/** The one floating chart readout: portalled to the body, placed, never taking the pointer. */
async function placedTip(page: Page) {
  const tip = page.locator("body > .fa-chart-tip[data-placed]");
  await expect(tip).toHaveCount(1);
  await expect(tip).toBeVisible();
  await expect(tip).toHaveCSS("pointer-events", "none");
  await expect(tip).toHaveAttribute("aria-hidden", "true");
  return tip;
}

/** The tooltip's figure must match the hit layer's own value text for the same position. */
async function expectValueMatches(slider: Locator, tip: Locator) {
  const value = (await tip.locator(".fa-chart-tip-value").first().innerText()).trim();
  expect(value.length).toBeGreaterThan(0);
  await expect(slider).toHaveAttribute("aria-valuetext", new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

for (const uiScale of [1, 1.25]) {
  test(`a single-series area chart shows the value at the pointer (ui scale ${uiScale})`, async ({ page }, info) => {
    await appearance(page, uiScale);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("./components/area-chart");
    const pane = page.getByTestId("chart-area-chart-single");
    const chart = pane.locator(".fa-chart");
    await expect(chart).toHaveAttribute("data-tier", "full");
    await pane.scrollIntoViewIfNeeded();
    const slider = chart.getByRole("slider", { name: "Render queue · fictional studio — inspect values" });
    const plot = (await slider.boundingBox())!;

    for (const fraction of [0.5, 0.97]) {
      const x = plot.x + plot.width * fraction;
      const y = plot.y + plot.height * 0.5;
      await page.mouse.move(x, y);
      const tip = await placedTip(page);
      // One row: the series' value and label keyed by its colour; the x and relative time above.
      await expect(tip.locator(".fa-chart-tip-row")).toHaveCount(1);
      await expect(tip.locator(".fa-chart-tip-label")).toHaveText("Render queue");
      await expect(tip.locator(".fa-chart-key")).toHaveAttribute("data-slot", "1");
      await expect(tip.locator(".fa-chart-tip-title")).not.toBeEmpty();
      await expect(tip.locator(".fa-chart-tip-meta")).toHaveText(/ago|now/);
      await expectValueMatches(slider, tip);
      // The head readout still follows the crosshair (Metric's model).
      await expect(chart.locator(".fa-chart-readout")).toHaveAttribute("data-hovering", "");
      const value = await tip.locator(".fa-chart-tip-value").innerText();
      await expect(chart.locator(".fa-chart-readout-value")).toHaveText(value);

      // Beside the crosshair (the pointer snaps to the nearest sample), inside the viewport.
      const box = (await tip.boundingBox())!;
      const crosshair = (await page.locator(".fa-chart-crosshair").boundingBox())!;
      const cx = crosshair.x + crosshair.width / 2;
      const viewport = page.viewportSize()!;
      expect(box.x).toBeGreaterThanOrEqual(7.5);
      expect(box.y).toBeGreaterThanOrEqual(7.5);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 7.5);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 7.5);
      expect(cx < box.x || cx > box.x + box.width).toBe(true);
      expect(Math.min(Math.abs(box.x - cx), Math.abs(box.x + box.width - cx))).toBeLessThan(20);
      // Its content fits: nothing in the overlay is clipped.
      const clipped = await tip.evaluate((element) =>
        [...element.querySelectorAll<HTMLElement>("*")].some((child) => child.scrollWidth > child.clientWidth + 1),
      );
      expect(clipped).toBe(false);
      await page.screenshot({
        path: info.outputPath(`area-single-tooltip-scale-${uiScale}-${fraction}.png`),
        clip: { x: Math.max(0, plot.x - 24), y: Math.max(0, plot.y - 96), width: Math.min(viewport.width, plot.width + 48), height: plot.height + 140 },
      });
    }

    // Leaving the plot removes it.
    await page.mouse.move(2, 2);
    await expect(page.locator(".fa-chart-tip")).toHaveCount(0);
  });
}

test("a single-series area chart's tooltip follows the keyboard cursor and the live readout stays", async ({ page }) => {
  await appearance(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./components/area-chart");
  const chart = page.getByTestId("chart-area-chart-single").locator(".fa-chart");
  const slider = chart.getByRole("slider", { name: "Render queue · fictional studio — inspect values" });
  await slider.focus();
  let tip = await placedTip(page);
  // The cursor starts at the latest sample.
  await expect(tip.locator(".fa-chart-tip-value")).toHaveText(/^6\s?jobs$/);
  await expectValueMatches(slider, tip);
  const before = (await tip.boundingBox())!;
  await page.keyboard.press("ArrowLeft");
  tip = await placedTip(page);
  await expect(tip.locator(".fa-chart-tip-value")).toHaveText(/^7\s?jobs$/);
  await expectValueMatches(slider, tip);
  // Arrowing to the marker's sample names the marker in the footer.
  await page.keyboard.press("Home");
  for (let step = 0; step < 6; step++) await page.keyboard.press("ArrowRight");
  tip = await placedTip(page);
  await expect(tip.locator(".fa-chart-tip-value")).toHaveText(/^14\s?jobs$/);
  await expect(tip.locator(".fa-chart-tip-foot")).toHaveText("Batch submitted");
  const after = (await tip.boundingBox())!;
  expect(after.x).not.toBe(before.x);
  // The polite announcement for keyboard users is still there.
  await expect(chart.locator("[aria-live='polite']").filter({ hasText: "Render queue" })).toContainText(/Render queue 14\s?jobs/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".fa-chart-tip")).toHaveCount(0);
});

test("a multi-series chart with all but one series hidden still shows the tooltip", async ({ page }) => {
  await appearance(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./components/area-chart");
  const chart = page.getByTestId("chart-area-chart").locator(".fa-chart");
  await chart.getByRole("toolbar", { name: "Series" }).getByRole("button", { name: "Review" }).click();
  await expect(chart.getByRole("button", { name: "Review" })).toHaveAttribute("aria-pressed", "false");
  const slider = chart.getByRole("slider", { name: "AreaChart · fictional studio projects — inspect values" });
  const plot = (await slider.boundingBox())!;
  await page.mouse.move(plot.x + plot.width * 0.6, plot.y + plot.height * 0.5);
  const tip = await placedTip(page);
  await expect(tip.locator(".fa-chart-tip-row")).toHaveCount(1);
  await expect(tip.locator(".fa-chart-tip-label")).toHaveText("Planned");
  // One visible band: no total that repeats its value.
  await expect(tip.locator(".fa-chart-tip-foot")).toHaveCount(0);
  // Both visible again: two rows and the total.
  await page.mouse.move(2, 2);
  await chart.getByRole("button", { name: "Review" }).click();
  await page.mouse.move(plot.x + plot.width * 0.6, plot.y + plot.height * 0.5);
  const both = await placedTip(page);
  await expect(both.locator(".fa-chart-tip-row")).toHaveCount(2);
  await expect(both.locator(".fa-chart-tip-foot")).toHaveText(/^Total /);
});

// Every full-tier chart with a hover cursor shows a floating value at it (gauges have no cursor).
const HOVERABLE = [
  "line-chart",
  "area-chart",
  "bar-chart",
  "column-chart",
  "histogram",
  "pie-chart",
  "donut-chart",
  "heatmap",
  "scatter-chart",
  "treemap",
  "sunburst",
];

for (const id of HOVERABLE) {
  test(`${id}: the keyboard cursor shows a floating value`, async ({ page }) => {
    await appearance(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`./components/${id}`);
    const chart = page.getByTestId(`chart-${id}`).locator(".fa-chart");
    await expect(chart).toHaveAttribute("data-tier", "full");
    const slider = chart.getByRole("slider");
    await slider.focus();
    const tip = await placedTip(page);
    await expect(tip).not.toBeEmpty();
    // A treemap tile names its size beside its title; its rows are the tile's children.
    if (id === "treemap") return expect(tip.locator(".fa-chart-tip-meta")).toHaveText(/\d/);
    await expect(tip.locator(".fa-chart-tip-value").first()).not.toBeEmpty();
    const value = (await tip.locator(".fa-chart-tip-value").first().innerText()).trim();
    const text = (await slider.getAttribute("aria-valuetext")) ?? "";
    // The figure is the cursor's value (heat maps and scatter lead with x or a cell value).
    expect(text.replace(/\s/g, "")).toContain(value.replace(/\s/g, ""));
  });
}

test("a hover readout closes with Escape without moving the pointer, and the chart passes axe", async ({ page }) => {
  await appearance(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./components/area-chart");
  const pane = page.getByTestId("chart-area-chart-single");
  await pane.scrollIntoViewIfNeeded();
  const slider = pane.locator(".fa-chart").getByRole("slider");
  const plot = (await slider.boundingBox())!;
  await page.mouse.move(plot.x + plot.width * 0.5, plot.y + plot.height * 0.5);
  await placedTip(page);
  // Focus is not in the chart: Escape still dismisses what the pointer opened.
  await expect(slider).not.toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("body > .fa-chart-tip[data-placed]")).toHaveCount(0);
  // Moving again brings it back.
  await page.mouse.move(plot.x + plot.width * 0.6, plot.y + plot.height * 0.5);
  await placedTip(page);

  // Keyboard: the slider steps through the data and Escape clears the readout.
  await slider.focus();
  const first = await slider.getAttribute("aria-valuetext");
  await page.keyboard.press("ArrowLeft");
  await expect(slider).not.toHaveAttribute("aria-valuetext", first!);
  await page.keyboard.press("Escape");
  await expect(page.locator("body > .fa-chart-tip[data-placed]")).toHaveCount(0);
  const result = await new AxeBuilder({ page }).include("#examples").analyze();
  expect(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
});
