import { test, expect, type Locator, type Page } from "@playwright/test";

/** The popup opens at 0.9 scale: its box is only true once the transition has finished. */
const settled = (popup: Locator) =>
  popup.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));

/**
 * Density, UI scale, radius and line weight for Typeahead, FindBar, ActivityFeed and DiffView,
 * on phone and desktop: computed geometry against the theme, not only that the pages render.
 */
const PRESETS = [
  { name: "default", density: "comfortable", uiScale: 1, radiusScale: 1, borderWidth: 1 },
  { name: "dense large", density: "compact", uiScale: 1.25, radiusScale: 0, borderWidth: 2, mode: "dark" },
  { name: "dense small", density: "compact", uiScale: 0.875, radiusScale: 1.5, borderWidth: 0.5, glass: "solid" },
] as const;

const token = (page: Page, name: string, property = "height") =>
  page.evaluate(
    ([name, property]) => {
      const probe = document.createElement("div");
      probe.style.setProperty(property!, `var(${name})`);
      document.body.append(probe);
      const value = Number.parseFloat(getComputedStyle(probe).getPropertyValue(property!));
      probe.remove();
      return value;
    },
    [name, property],
  );

const noPageOverflow = (page: Page) =>
  expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true);

for (const preset of PRESETS)
  test.describe(preset.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((settings) => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify(settings)), { ...preset, motion: "reduced" });
    });

    test(`FindBar follows the theme @responsive`, async ({ page }) => {
      await page.goto("/components/find-bar");
      const states = page.getByTestId("find-bar-states");
      await expect(states.locator(".fa-find-bar")).toHaveCount(6);
      const height = await token(page, "--control-h-sm");
      const input = (await states.locator(".fa-find-bar-term").first().boundingBox())!;
      // The shared Input's line can stand a pixel over the role at the smallest compact scale.
      expect(Math.abs(input.height - height)).toBeLessThanOrEqual(1);
      const widths = await states.locator(".fa-find-bar-count").evaluateAll((list) => list.map((element) => element.getBoundingClientRect().width));
      expect(new Set(widths).size).toBe(1);
      const floating = page.getByRole("search", { name: "Find in log" });
      const radius = await token(page, "--radius-overlay", "border-top-left-radius");
      await expect(floating).toHaveCSS("border-top-left-radius", `${radius}px`);
      await expect(floating).toHaveCSS("border-top-width", `${await token(page, "--border-width", "border-top-width")}px`);
      const clear = await page.getByTestId("find-bar-scroller").evaluate((scroller) => {
        const box = scroller.getBoundingClientRect();
        const bar = document.querySelector("[aria-label='Find in log']")!.getBoundingClientRect();
        return bar.right <= box.left + scroller.clientWidth && bar.top > box.top && bar.left >= box.left;
      });
      expect(clear).toBe(true);
      await noPageOverflow(page);
    });

    test(`Typeahead follows the theme @responsive`, async ({ page }) => {
      await page.goto("/components/typeahead");
      await page.getByRole("combobox", { name: "Find a file with detail" }).focus();
      const popup = page.locator(".fa-typeahead");
      await expect(popup.getByRole("option").first()).toBeVisible();
      await settled(popup);
      await expect(popup).toHaveCSS("border-top-left-radius", `${await token(page, "--radius-overlay", "border-top-left-radius")}px`);
      const row = (await popup.getByRole("option").first().boundingBox())!;
      expect(row.height).toBeGreaterThanOrEqual((await token(page, "--item-h")) - 0.5);
      const box = (await popup.boundingBox())!;
      const width = page.viewportSize()!.width;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
      await noPageOverflow(page);
    });

    test(`a late list keeps its box at this scale`, async ({ page }) => {
      await page.goto("/components/typeahead");
      await page.getByRole("combobox", { name: "Find a file, slowly" }).focus();
      const popup = page.locator(".fa-typeahead");
      await expect(popup.getByRole("option")).toHaveCount(2);
      await settled(popup);
      const before = (await popup.boundingBox())!;
      await expect(popup.getByRole("option")).toHaveCount(6);
      expect(await popup.boundingBox()).toEqual(before);
    });

    test(`ActivityFeed rows follow the theme @responsive`, async ({ page }) => {
      await page.goto("/components/activity-feed");
      const option = page.getByRole("listbox", { name: "Version history" }).getByRole("option").first();
      await expect(option).toHaveCSS("border-top-left-radius", `${await token(page, "--radius-item", "border-top-left-radius")}px`);
      const row = (await option.boundingBox())!;
      expect(row.height).toBeGreaterThanOrEqual((await token(page, "--item-h")) - 0.5);
      await noPageOverflow(page);
    });

    test(`DiffView follows the theme @responsive`, async ({ page }) => {
      await page.goto("/components/diff-view");
      const line = page.getByTestId("diff-view-demo").locator(".fa-diff-line").first();
      await expect(line).toHaveCSS("border-top-left-radius", `${await token(page, "--radius-line", "border-top-left-radius")}px`);
      await expect(page.getByTestId("diff-view-narrow").locator(".fa-diff-number").first()).toBeHidden();
      await noPageOverflow(page);
    });
  });

test("floating and list placement follow the reading direction", async ({ page }) => {
  await page.goto("/components/find-bar");
  await expect(page.getByRole("search", { name: "Find in log" })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dir = "rtl";
  });
  const bar = (await page.getByRole("search", { name: "Find in log" }).boundingBox())!;
  const frame = (await page.getByTestId("find-bar-scroller").boundingBox())!;
  expect(bar.x - frame.x).toBeLessThan(frame.x + frame.width - (bar.x + bar.width));
  const previous = (await page.getByRole("search", { name: "Empty" }).getByRole("button", { name: "Previous match" }).boundingBox())!;
  const close = (await page.getByRole("search", { name: "Empty" }).getByRole("button", { name: "Close find" }).boundingBox())!;
  expect(close.x).toBeLessThan(previous.x);

  await page.goto("/components/activity-feed");
  await expect(page.getByRole("listbox", { name: "Version history" })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dir = "rtl";
  });
  const list = page.getByRole("listbox", { name: "Version history" });
  const parent = (await list.getByRole("option").nth(1).boundingBox())!;
  const branch = (await list.getByRole("option").nth(2).boundingBox())!;
  expect(branch.x + branch.width).toBeLessThan(parent.x + parent.width);
});
