import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ROUTE = "/components/reaction-bar";
const bar = (page: Page) => page.getByTestId("reactions-controlled").getByRole("toolbar", { name: "Reactions" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })));
  await page.goto(ROUTE);
  await expect(bar(page)).toBeVisible();
});

test("names say the count and the emoji; pressing toggles @responsive", async ({ page }) => {
  const up = bar(page).getByRole("button", { name: "2 people reacted with thumbs up" });
  await expect(up).toHaveAttribute("aria-pressed", "false");
  await up.click();
  const pressed = bar(page).getByRole("button", { name: "3 people reacted with thumbs up" });
  await expect(pressed).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("reactions-last")).toHaveText("👍 added");
  await expect(bar(page).getByRole("button", { name: "1 person reacted with red heart" })).toHaveAttribute("aria-pressed", "true");
  await bar(page).getByRole("button", { name: "1 person reacted with red heart" }).click();
  await expect(bar(page).getByRole("button", { name: /red heart/ })).toHaveCount(0);
  await expect(bar(page).getByRole("button", { name: "12 people reacted with rocket" })).toBeVisible();
});

test("the bar is one tab stop and arrows follow reading order @responsive", async ({ page }) => {
  const add = bar(page).getByRole("button", { name: "Add reaction" });
  await add.focus();
  await page.keyboard.press("ArrowRight");
  await expect(bar(page).getByRole("button", { name: /thumbs up/ })).toBeFocused();
  await page.keyboard.press("Tab");
  expect(await bar(page).evaluate((element) => element.contains(document.activeElement))).toBe(false);
  await page.keyboard.press("Shift+Tab");
  await expect(bar(page).getByRole("button", { name: /thumbs up/ })).toBeFocused();
  await page.goto(`${ROUTE}?dir=rtl`);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await bar(page).getByRole("button", { name: "Add reaction" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(bar(page).getByRole("button", { name: /thumbs up/ })).toBeFocused();
});

test("a reaction arriving at the end moves nothing @responsive", async ({ page }) => {
  const places = () =>
    bar(page).evaluate((element) => {
      const origin = element.getBoundingClientRect();
      return [...element.querySelectorAll("button")].slice(0, 4).map((button) => {
        const box = button.getBoundingClientRect();
        return [box.left - origin.left, box.top - origin.top];
      });
    });
  const before = await places();
  await page.getByRole("button", { name: "Someone reacts" }).click();
  await expect(bar(page).getByRole("button", { name: "1 person reacted with party popper" })).toBeVisible();
  expect(await places()).toEqual(before);
});

test("adding through the picker counts a new reaction, and focus comes back", async ({ page }) => {
  const add = bar(page).getByRole("button", { name: "Add reaction" });
  await add.click();
  const picker = page.getByRole("group", { name: "Emoji picker" });
  await expect(picker.getByRole("searchbox", { name: "Search emoji" })).toBeFocused();
  await page.keyboard.type("popper");
  await expect(picker.getByRole("option", { name: "party popper" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(bar(page).getByRole("button", { name: "1 person reacted with party popper" })).toHaveAttribute("aria-pressed", "true");
  await expect(picker).toBeHidden();
  await expect(add).toBeFocused();
});

test("read-only has no controls, and a reason keeps them disabled", async ({ page }) => {
  const readOnly = page.getByRole("group", { name: "Read-only reactions" });
  await expect(readOnly.getByRole("button")).toHaveCount(0);
  await expect(readOnly.getByRole("img", { name: "2 people reacted with thumbs up" })).toBeVisible();
  const locked = page.getByRole("toolbar", { name: "Locked reactions" });
  await expect(locked.getByRole("button", { name: /thumbs up/ })).toHaveAttribute("aria-description", "Reactions are locked during the design freeze");
});

test("every target keeps 24px @responsive", async ({ page }) => {
  const sizes = await bar(page).getByRole("button").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  for (const height of sizes) expect(height).toBeGreaterThanOrEqual(24);
});

test("axe finds nothing", async ({ page }) => {
  const results = await new AxeBuilder({ page }).include(".gallery-specimen").analyze();
  expect(results.violations.filter((violation) => violation.id !== "region")).toEqual([]);
});
