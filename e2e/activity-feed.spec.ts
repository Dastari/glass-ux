import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("a version history is one tab stop with selection on Enter @responsive", async ({ page }) => {
  await page.goto("/components/activity-feed");
  const list = page.getByRole("listbox", { name: "Version history" });
  const options = list.getByRole("option");
  await expect(options).toHaveCount(6);
  await expect(options.nth(2)).toHaveAttribute("aria-selected", "true");
  await options.nth(2).focus();
  await page.keyboard.press("ArrowUp");
  await expect(options.nth(1)).toBeFocused();
  await expect(options.nth(2)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("activity-selected")).toHaveText("v13");
  await page.keyboard.press("Tab");
  await expect(list.locator(":focus")).toHaveCount(0);
  await page.keyboard.press("Shift+Tab");
  await expect(options.nth(1)).toBeFocused();
});

test("branches sit under their parent, and the ring is inside the row", async ({ page }) => {
  await page.goto("/components/activity-feed");
  const list = page.getByRole("listbox", { name: "Version history" });
  const parent = (await list.getByRole("option").nth(1).boundingBox())!;
  const branch = (await list.getByRole("option").nth(2).boundingBox())!;
  expect(branch.y).toBeGreaterThanOrEqual(parent.y + parent.height);
  expect(branch.x).toBeGreaterThan(parent.x);
  const outline = await list.getByRole("option").first().evaluate((element) => {
    (element as HTMLElement).focus({ focusVisible: true } as FocusOptions);
    return Number.parseFloat(getComputedStyle(element).outlineOffset);
  });
  expect(outline).toBeLessThan(0);
});

test("selected rows differ by more than colour in forced colours", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/components/activity-feed");
  const selected = page.getByRole("listbox", { name: "Version history" }).getByRole("option", { selected: true });
  await expect(selected).toHaveCSS("outline-style", "solid");
});

test("tone and branches alone keep a plain list", async ({ page }) => {
  await page.goto("/components/activity-feed");
  const plain = page.getByTestId("activity-plain-timeline");
  await expect(plain.getByRole("list", { name: "Release timeline" })).toBeVisible();
  await expect(plain.getByRole("option")).toHaveCount(0);
});

test("the feed has no axe violations", async ({ page }) => {
  await page.goto("/components/activity-feed");
  await expect(page.getByRole("listbox", { name: "Version history" })).toBeVisible();
  const results = await new AxeBuilder({ page }).include(".fa-activity-feed").analyze();
  expect(results.violations).toEqual([]);
});
