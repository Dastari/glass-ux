import { expect, test, type Page } from "@playwright/test";

/*
 * Tree rows, tab marks, the status bar and chords against the theme: geometry follows density,
 * UI scale, radius and line weight instead of fixed values, and nothing widens a phone.
 */
const APPEARANCES = [
  { density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1 },
  { density: "compact", uiScale: 1.125, radiusScale: 1.4, borderWidth: 1.5 },
  { density: "comfortable", uiScale: 0.9, radiusScale: 0, borderWidth: 2 },
] as const;

const open = async (page: Page, route: string, appearance: (typeof APPEARANCES)[number]) => {
  await page.addInitScript((value) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced", ...value })), appearance);
  await page.goto(route);
};

const px = (page: Page, value: string) =>
  page.evaluate((expression) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;width:${expression}`;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, value);

for (const appearance of APPEARANCES) {
  const name = `${appearance.density}, scale ${appearance.uiScale}, radius ${appearance.radiusScale}, line ${appearance.borderWidth}`;

  test(`tree rows and marks follow the theme: ${name} @responsive`, async ({ page }) => {
    await open(page, "./components/tree", appearance);
    const row = page.locator('[data-testid="tree-project"] [data-row-id="brief/budget"]');
    await expect(row).toBeVisible();
    // The rows mount again when the drag code arrives.
    await expect(page.locator('[data-testid="tree-project"] .fa-tree-drop-line')).toBeAttached();
    const box = (await row.boundingBox())!;
    expect(Math.abs(box.height - (await px(page, "var(--item-h)")))).toBeLessThan(1);
    const check = page.locator('[data-testid="tree-project"] .fa-tree-check').first();
    expect(Math.abs((await check.boundingBox())!.width - (await px(page, "var(--icon-sm)")))).toBeLessThan(1);
    const radius = await check.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderStartStartRadius));
    expect(Math.abs(radius - (await px(page, "var(--radius-check)")))).toBeLessThan(1);
    const line = await check.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderBlockStartWidth));
    expect(Math.abs(line - (await px(page, "var(--border-width)")))).toBeLessThan(1);
    // The rename field keeps the row's height.
    await row.click();
    await page.keyboard.press("F2");
    await expect(row.getByRole("textbox")).toBeFocused();
    expect((await row.boundingBox())!.height).toBe(box.height);
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test(`tab marks keep their box and hit area: ${name} @responsive`, async ({ page }) => {
    await open(page, "./components/tabs", appearance);
    const tab = page.getByTestId("tabs-documents").getByRole("tab", { name: "Budget review Unsaved changes" });
    await expect(tab).toBeVisible();
    expect(Math.abs((await tab.boundingBox())!.height - (await px(page, "var(--control-h-md)")))).toBeLessThan(1);
    const marks = tab.locator(".fa-tab-marks");
    expect(Math.abs((await marks.boundingBox())!.width - (await px(page, "var(--icon-sm)")))).toBeLessThan(1);
    const target = await tab.locator(".fa-tab-close").evaluate((element) => Number.parseFloat(getComputedStyle(element, "::after").width));
    expect(target).toBeGreaterThanOrEqual(23.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test(`the status bar uses the theme's insets and stays in its box: ${name} @responsive`, async ({ page }) => {
    await open(page, "./components/status-bar", appearance);
    const bar = page.getByTestId("status-bar-medium").locator(".fa-status-bar");
    await expect(bar).toBeVisible();
    const inset = await bar.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingInlineStart));
    expect(Math.abs(inset - (await px(page, "var(--space-4)")))).toBeLessThan(1);
    expect((await bar.boundingBox())!.height).toBeGreaterThanOrEqual((await px(page, "var(--control-h-sm)")) - 1);
    const end = await bar.locator(".fa-status-bar-end").boundingBox();
    const box = (await bar.boundingBox())!;
    expect(end!.x + end!.width).toBeLessThanOrEqual(box.x + box.width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}
