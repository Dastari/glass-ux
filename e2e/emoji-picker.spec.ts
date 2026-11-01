import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ROUTE = "/components/emoji-picker";
const picker = (page: Page) => page.getByTestId("emoji-inline");
const search = (page: Page) => picker(page).getByRole("searchbox", { name: "Search emoji" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })));
  await page.goto(ROUTE);
  await expect(picker(page).getByRole("listbox")).toBeVisible();
});

test("search, the arrow keys and picking, as one tab stop @responsive", async ({ page }) => {
  const options = () => picker(page).getByRole("listbox").getByRole("option");
  await search(page).fill("rocket");
  await expect(options().first()).toHaveAccessibleName("rocket");
  await search(page).fill("cat");
  await expect(options().first()).toBeVisible();
  await search(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(options().first()).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(options().nth(1)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(options().first()).toBeFocused();
  // Only one option is in the tab order, and Up from the first row returns to the search.
  expect(await picker(page).getByRole("listbox").locator('[tabindex="0"]').count()).toBe(1);
  await page.keyboard.press("ArrowUp");
  await expect(search(page)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("emoji-picked")).not.toHaveText("Nothing picked");
});

test("moving down keeps the column, whatever the width @responsive", async ({ page }) => {
  await picker(page).getByRole("tab", { name: "Smileys and emotion" }).click();
  const options = picker(page).getByRole("listbox").getByRole("option");
  await options.first().focus();
  await page.keyboard.press("ArrowDown");
  const first = (await options.first().boundingBox())!;
  const moved = (await page.locator(":focus").boundingBox())!;
  expect(moved.x).toBeCloseTo(first.x, 0);
  expect(moved.y).toBeGreaterThan(first.y);
});

test("in RTL the arrows follow reading order", async ({ page }) => {
  await page.goto(`${ROUTE}?dir=rtl`);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const options = picker(page).getByRole("listbox").getByRole("option");
  await options.first().focus();
  await page.keyboard.press("ArrowLeft");
  await expect(options.nth(1)).toBeFocused();
});

test("typing in the list searches, and an empty result names the query and clears", async ({ page }) => {
  const options = picker(page).getByRole("listbox").getByRole("option");
  await options.first().focus();
  await page.keyboard.press("z");
  await expect(search(page)).toBeFocused();
  await expect(search(page)).toHaveValue("z");
  await search(page).fill("qqqq");
  await expect(picker(page).getByRole("status")).toContainText('No emoji match "qqqq"');
  await picker(page).getByRole("button", { name: "Clear search" }).click();
  await expect(search(page)).toHaveValue("");
});

test("recent comes first, tabs switch groups, and the box never resizes @responsive", async ({ page }) => {
  const size = async () => {
    const box = (await picker(page).locator(".fa-emoji-picker").boundingBox())!;
    return [box.width, box.height];
  };
  const box = await size();
  await expect(picker(page).getByRole("tab", { name: "Recent" })).toHaveAttribute("aria-selected", "true");
  await expect(picker(page).getByRole("listbox").getByRole("option")).toHaveCount(4);
  await picker(page).getByRole("tab", { name: "Flags" }).click();
  await expect(picker(page).getByRole("option", { name: "flag Australia" })).toBeAttached();
  await search(page).fill("qqqq");
  await expect(picker(page).getByRole("status")).toBeVisible();
  expect(await size()).toEqual(box);
});

test("a skin tone applies to what takes one", async ({ page }) => {
  await search(page).fill("waving hand");
  await picker(page).getByRole("button", { name: "Skin tone" }).click();
  await page.getByRole("menuitemradio", { name: "Dark", exact: true }).click();
  await picker(page).getByRole("option", { name: "waving hand" }).click();
  await expect(page.getByTestId("emoji-picked")).toHaveText("👋🏿 waving hand");
});

test("the popover loads on demand and returns focus @responsive", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Choose an emoji" });
  await trigger.click();
  const search = page.getByRole("dialog", { name: "Emoji picker" }).getByRole("searchbox", { name: "Search emoji" });
  await expect(search).toBeFocused();
  await page.keyboard.type("rocket");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("emoji-popover-picked")).toHaveText("🚀");
  await expect(trigger).toBeFocused();
});

test("names from the application are shown and searched, beside the English", async ({ page }) => {
  const names = page.getByTestId("emoji-names");
  const field = names.getByRole("searchbox", { name: "Search emoji" });
  await field.fill("sourire");
  await expect(names.getByRole("option").first()).toHaveAccessibleName("visage souriant sourire");
  await field.fill("rocket");
  await expect(names.getByRole("option", { name: "rocket" })).toBeVisible();
});

test("a failed load shows Retry in place, and retry loads it", async ({ page }) => {
  await page.route("**/emoji-data*", (route) => route.abort());
  await page.goto("/components/emoji-picker");
  await expect(picker(page).getByRole("alert")).toContainText("did not load");
  await page.unroute("**/emoji-data*");
  await picker(page).getByRole("button", { name: "Retry" }).click();
  await expect(picker(page).getByRole("listbox")).toBeVisible();
});

test("axe finds nothing", async ({ page }) => {
  const results = await new AxeBuilder({ page }).include(".gallery-specimen").analyze();
  expect(results.violations.filter((violation) => violation.id !== "region")).toEqual([]);
});
