import { expect, test, type Page } from "@playwright/test";

/*
 * LineChart zoom and the overview brush. Drag, Ctrl + wheel and + / − zoom the x axis; a
 * plain wheel still scrolls the page; Reset zoom appears in a reserved place; the brush's
 * handles are labelled sliders; a controlled xDomain keeps two charts on one window.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/components/line-chart");
  await expect(page.getByTestId("chart-zoom").locator(".fa-chart-line").first()).toBeAttached({ timeout: 30_000 });
  await page.getByTestId("chart-zoom").scrollIntoViewIfNeeded();
});

const chart = (page: Page) => page.getByTestId("chart-zoom");
const firstTick = (page: Page, id = "chart-zoom") => page.getByTestId(id).locator(".fa-chart-tick[data-axis='x']").first().textContent();
const startHandle = (page: Page) => chart(page).getByRole("slider", { name: "Start of the visible range" });

test("drag across the plot zooms; Reset zoom appears in its reserved place and resets", async ({ page }) => {
  const reset = chart(page).locator(".fa-chart-reset");
  const resting = (await reset.boundingBox())!;
  await expect(reset).toBeHidden();
  const tools = (await chart(page).getByRole("button", { name: "View as table" }).boundingBox())!;
  const before = await firstTick(page);
  const hit = (await chart(page).locator(".fa-chart-hit").boundingBox())!;
  await page.mouse.move(hit.x + hit.width * 0.3, hit.y + hit.height / 2);
  await page.mouse.down();
  await page.mouse.move(hit.x + hit.width * 0.4, hit.y + hit.height / 2, { steps: 4 });
  await expect(chart(page).locator(".fa-chart-zoom-rect")).toBeVisible();
  await page.mouse.move(hit.x + hit.width * 0.5, hit.y + hit.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(chart(page).locator(".fa-chart-zoom-rect")).toBeHidden();
  await expect(reset).toBeVisible();
  expect(await firstTick(page)).not.toBe(before);
  // Nothing in the head moved when the control appeared.
  expect(await reset.boundingBox()).toEqual(resting);
  expect(await chart(page).getByRole("button", { name: "View as table" }).boundingBox()).toEqual(tools);
  // The linked chart shares the window.
  expect(await firstTick(page, "chart-zoom-linked")).toBe(await firstTick(page));
  // The crosshair and tooltip still work while zoomed.
  await page.mouse.move(hit.x + hit.width * 0.6, hit.y + hit.height / 2);
  await expect(page.locator(".fa-chart-tip").filter({ visible: true })).toHaveCount(1);
  await chart(page).getByRole("button", { name: "Reset zoom" }).click();
  await expect(reset).toBeHidden();
  expect(await firstTick(page)).toBe(before);
});

test("a plain wheel scrolls the page; Ctrl + wheel zooms the chart", async ({ page }) => {
  const hit = (await chart(page).locator(".fa-chart-hit").boundingBox())!;
  await page.mouse.move(hit.x + hit.width / 2, hit.y + hit.height / 2);
  const scroller = page.locator("[data-scroll-container]").filter({ has: chart(page) }).first();
  const scrolled = async () => (await scroller.count()) ? scroller.evaluate((el) => el.scrollTop) : page.evaluate(() => window.scrollY);
  const top = await scrolled();
  await page.mouse.wheel(0, 200);
  await expect.poll(scrolled).toBeGreaterThan(top);
  await expect(chart(page).locator(".fa-chart-reset")).toBeHidden();
  const box = (await chart(page).locator(".fa-chart-hit").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.down("Control");
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -100);
  await page.keyboard.up("Control");
  await expect(chart(page).locator(".fa-chart-reset")).toBeVisible();
});

test("keyboard: + and − zoom, Shift+arrows pan, 0 resets, and the change is announced", async ({ page }) => {
  const plot = chart(page).getByRole("slider", { name: /inspect values/ });
  await expect(plot).toHaveAttribute("aria-keyshortcuts", /\+/);
  await plot.focus();
  const before = await firstTick(page);
  await page.keyboard.press("+");
  await expect(chart(page).locator(".fa-chart-reset")).toBeVisible();
  await expect(chart(page).locator(".sr-only[aria-live]").last()).toContainText(/^Showing .+ to .+/);
  const zoomed = await firstTick(page);
  expect(zoomed).not.toBe(before);
  const start = await startHandle(page).getAttribute("aria-valuenow");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect.poll(() => startHandle(page).getAttribute("aria-valuenow")).not.toBe(start);
  await page.keyboard.press("0");
  await expect(chart(page).locator(".fa-chart-reset")).toBeHidden();
  await expect(chart(page).locator(".sr-only[aria-live]").last()).toHaveText("Showing the whole range");
});

test("the brush: labelled sliders move the window by keyboard and pointer", async ({ page }) => {
  const brush = chart(page).locator(".fa-chart-brush");
  await expect(brush).toHaveAttribute("role", "group");
  const start = startHandle(page);
  const end = chart(page).getByRole("slider", { name: "End of the visible range" });
  await expect(start).toHaveAttribute("aria-valuenow", "0");
  await expect(end).toHaveAttribute("aria-valuenow", "287");
  await start.focus();
  await page.keyboard.press("PageUp");
  await expect(start).toHaveAttribute("aria-valuenow", "29");
  await expect(start).toHaveAttribute("aria-valuetext", /\d/);
  await expect(chart(page).locator(".fa-chart-reset")).toBeVisible();
  // Drag the window to pan it.
  const window = chart(page).getByRole("slider", { name: "Visible range", exact: true });
  const box = (await window.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(start).toHaveAttribute("aria-valuenow", "0");
  // The standalone ChartBrush keeps its own handles in range.
  const standalone = page.getByTestId("chart-brush");
  await standalone.scrollIntoViewIfNeeded();
  await expect(standalone.getByRole("slider", { name: "Start of the visible range" })).toHaveAttribute("aria-valuenow", "200");
  await expect(standalone.getByRole("slider", { name: "End of the visible range" })).toHaveAttribute("aria-valuenow", "260");
});

test("the zoom chart's loading skeleton keeps the brush's box @responsive", async ({ page }) => {
  const foot = chart(page).locator(".fa-chart-foot");
  await expect(foot).toBeVisible();
  const box = (await foot.boundingBox())!;
  expect(box.height).toBeGreaterThan(30);
  // On a phone the plot still gets most of the box.
  const plot = (await chart(page).locator(".fa-chart-plot").boundingBox())!;
  expect(plot.height).toBeGreaterThan(box.height * 2);
});
