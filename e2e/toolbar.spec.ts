import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/*
 * Toolbar: one tab stop with arrow keys between controls; when it runs out of room, low
 * priority items fold into More first (the last ones first), and More lists them as menu items.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" }));
  });
  await page.goto("/components/toolbar");
  await expect(page.getByRole("toolbar", { name: "Report view" }).first()).toBeVisible({ timeout: 30_000 });
});

test("arrow keys move between controls and a toggle reports its state", async ({ page }) => {
  const bar = page.getByRole("toolbar", { name: "Report view" }).first();
  const filters = bar.getByRole("button", { name: "Filters" });
  await filters.focus();
  await expect(filters).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Enter");
  await expect(filters).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("ArrowRight");
  await expect(bar.getByRole("button", { name: "Sort" })).toBeFocused();
});

test("a narrow toolbar folds low priority items into More, and More lists them", async ({ page }) => {
  const toolbars = page.getByRole("toolbar", { name: "Report view" });
  // The container lab's tile is the narrowest frame.
  let narrow = toolbars.first();
  let least = Infinity;
  for (const bar of await toolbars.all()) {
    const width = await bar.evaluate((element) => element.getBoundingClientRect().width);
    if (width > 0 && width < least) [least, narrow] = [width, bar];
  }
  await narrow.scrollIntoViewIfNeeded();
  await expect(narrow.getByRole("button", { name: "Download CSV" })).toBeHidden();
  await expect(narrow.getByRole("button", { name: "Filters" })).toBeVisible();
  const overflow = await narrow.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await narrow.getByRole("button", { name: "More" }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem", { name: "Download CSV" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Zoom in" })).toBeVisible();
  await page.keyboard.press("Escape");
  const results = await new AxeBuilder({ page }).include(".fa-toolbar").analyze();
  expect(results.violations).toEqual([]);
});
