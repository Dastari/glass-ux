import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * Windows High Contrast (forced colours, emulated): every control keeps a visible boundary,
 * focus is a visible outline, selected / checked / current states are drawn in Highlight
 * rather than a fill the browser would erase, disabled is GrayText, and materials become
 * Canvas with a border. Screenshots go to test-results for review.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "dark" })),
  );
  await page.emulateMedia({ forcedColors: "active", colorScheme: "dark" });
  await page.setViewportSize({ width: 1440, height: 1000 });
});

const style = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? null).getPropertyValue(p!), [property, pseudo] as const);
const visibleLine = (value: string) => value !== "" && !/^0px|none/.test(value);
/** An outline or border that is drawn: a non-zero width, a style and a colour that is not transparent. */
async function bounded(locator: Locator) {
  const [outline, outlineColour, border, borderColour] = await locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    return [`${cs.outlineWidth} ${cs.outlineStyle}`, cs.outlineColor, `${cs.borderTopWidth} ${cs.borderTopStyle}`, cs.borderTopColor];
  });
  const drawn = (line: string, colour: string) => visibleLine(line) && !line.endsWith("none") && !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(colour);
  return drawn(outline, outlineColour) || drawn(border, borderColour);
}
const shoot = (page: Page, name: string) => page.screenshot({ path: test.info().outputPath(`${name}.png`) });

test("buttons, fields and selects keep a boundary; focus is an outline", async ({ page }) => {
  await page.goto("/components/button");
  const buttons = page.locator(".gallery-component-document .fa-btn").filter({ visible: true });
  await expect(buttons.first()).toBeVisible({ timeout: 30_000 });
  for (const button of (await buttons.all()).slice(0, 12)) expect(await bounded(button)).toBe(true);
  // Disabled buttons are GrayText, not faded.
  const disabled = page.locator(".gallery-component-document .fa-btn:disabled, .gallery-component-document .fa-btn[aria-disabled='true']").first();
  expect(await style(disabled, "opacity")).toBe("1");
  await buttons.first().focus();
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus-visible");
  expect(await style(focused, "outline-style")).toBe("solid");
  expect(parseFloat(await style(focused, "outline-width"))).toBeGreaterThan(0);
  await shoot(page, "buttons");

  await page.goto("/components/select");
  const trigger = page.locator(".gallery-component-document .fa-select-trigger").first();
  await expect(trigger).toBeVisible({ timeout: 30_000 });
  expect(await bounded(trigger)).toBe(true);
  await trigger.click();
  const option = page.locator(".fa-select-item").filter({ visible: true }).first();
  await expect(option).toBeVisible();
  await page.keyboard.press("ArrowDown");
  const highlighted = page.locator(".fa-select-item[data-highlighted]");
  await expect(highlighted).toHaveCount(1);
  // The highlighted row is painted in Highlight (forced-color-adjust: none keeps it).
  expect(await style(highlighted, "forced-color-adjust")).toBe("none");
  await shoot(page, "select-open");
});

test("switches, checkboxes, radios, segmented and tabs show their state without a fill", async ({ page }) => {
  await page.goto("/components/switch");
  const on = page.locator(".gallery-component-document .fa-switch[data-checked]").first();
  const off = page.locator(".gallery-component-document .fa-switch:not([data-checked])").first();
  await expect(on).toBeVisible({ timeout: 30_000 });
  expect(await bounded(off)).toBe(true);
  expect(await style(on, "background-color")).not.toBe(await style(off, "background-color"));
  await shoot(page, "switch");

  await page.goto("/components/checkbox");
  const ticked = page.locator(".gallery-component-document .fa-check[data-checked]").first();
  const unticked = page.locator(".gallery-component-document .fa-check:not([data-checked])").first();
  await expect(ticked).toBeVisible({ timeout: 30_000 });
  expect(await bounded(unticked)).toBe(true);
  expect(await style(ticked, "background-color")).not.toBe(await style(unticked, "background-color"));
  const chosen = page.locator(".gallery-component-document .fa-radio[data-checked]").first();
  if (await chosen.count()) expect(await style(chosen, "background-color")).not.toBe(await style(unticked, "background-color"));
  await shoot(page, "checkbox");

  await page.goto("/components/segmented");
  const indicator = page.locator(".gallery-component-document .fa-segmented-indicator").first();
  await expect(indicator).toBeVisible({ timeout: 30_000 });
  expect(await style(indicator, "forced-color-adjust")).toBe("none");
  expect(await bounded(page.locator(".gallery-component-document .fa-segmented").first())).toBe(true);
  await shoot(page, "segmented");

  await page.goto("/components/tabs");
  const tabIndicator = page.locator(".gallery-component-document .fa-tabs-indicator").first();
  await expect(tabIndicator).toBeVisible({ timeout: 30_000 });
  expect(await style(tabIndicator, "forced-color-adjust")).toBe("none");
  await shoot(page, "tabs");
});

test("tree selection, calendar days, slider and status dots stay distinguishable", async ({ page }) => {
  await page.goto("/components/tree");
  const row = page.locator(".gallery-component-document .fa-tree-row").first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.click();
  const selected = page.locator(".gallery-component-document .fa-tree-row:is([data-selected], [aria-selected='true'])").first();
  await expect(selected).toBeVisible();
  expect(await bounded(selected)).toBe(true);
  await shoot(page, "tree");

  await page.goto("/components/calendar");
  const day = page.locator(".gallery-component-document .fa-calendar-day:not(:disabled)").nth(10);
  await expect(day).toBeVisible({ timeout: 30_000 });
  await day.click();
  const chosenDay = page.locator(".gallery-component-document .fa-calendar-day[data-selected]").first();
  if (await chosenDay.count()) expect(await style(chosenDay, "forced-color-adjust")).toBe("none");
  // Keyboard focus moves to the next day: its ring is an outline (the box-shadow ring would vanish).
  await page.keyboard.press("ArrowRight");
  expect(await style(page.locator(".fa-calendar-day:focus-visible"), "outline-style")).toBe("solid");
  await shoot(page, "calendar");

  await page.goto("/components/slider");
  const track = page.locator(".gallery-component-document .fa-slider-track").first();
  await expect(track).toBeVisible({ timeout: 30_000 });
  expect(await bounded(track)).toBe(true);
  expect(await style(page.locator(".gallery-component-document .fa-slider-fill").first(), "forced-color-adjust")).toBe("none");
  await shoot(page, "slider");

  await page.goto("/components/tone-dot");
  const dot = page.locator(".gallery-component-document .fa-status-dot").first();
  await expect(dot).toBeVisible({ timeout: 30_000 });
  expect(await bounded(dot)).toBe(true);
  await shoot(page, "tone-dot");
});

test("dialogs and overlays become Canvas with a border, without blur", async ({ page }) => {
  await page.goto("/components/dialog");
  const open = page.locator(".gallery-component-document .fa-btn").filter({ visible: true }).first();
  await expect(open).toBeVisible({ timeout: 30_000 });
  await open.click();
  const dialog = page.locator(".fa-dialog").filter({ visible: true }).first();
  await expect(dialog).toBeVisible();
  expect(await bounded(dialog)).toBe(true);
  expect(await style(dialog, "backdrop-filter")).toBe("none");
  await shoot(page, "dialog");
});

test("charts keep their series colours and the brush's handles; axe finds nothing", async ({ page }) => {
  await page.goto("/components/line-chart");
  const chart = page.getByTestId("chart-zoom");
  await expect(chart.locator(".fa-chart-line").first()).toBeAttached({ timeout: 30_000 });
  await chart.scrollIntoViewIfNeeded();
  expect(await style(chart.locator(".fa-chart-series").first(), "forced-color-adjust")).toBe("none");
  expect(await style(chart.locator(".fa-chart-brush-handle").first(), "forced-color-adjust")).toBe("none");
  await chart.locator(".fa-chart-hit").focus();
  expect(await style(chart.locator(".fa-chart-hit"), "outline-style")).toBe("solid");
  await shoot(page, "charts");
  const result = await new AxeBuilder({ page }).include("[data-testid='chart-zoom']").include("[data-testid='chart-references']").analyze();
  expect(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
});
