import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * Cascader: columns open to the right; arrows move within and across columns; Enter
 * chooses; search lists full paths; lazy levels load; the trigger drops middle levels; on
 * a phone the columns are one list with Back.
 */

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })),
  );
  await page.goto("/components/cascader");
  await expect(page.getByRole("combobox", { name: /^Delivery site/ }).first()).toBeVisible({ timeout: 30_000 });
  return errors;
}

const valueLine = (page: Page, n = 0) => page.locator("#examples").getByText(/^value: /).nth(n);

test("keyboard: arrows move within and across columns, Enter chooses the path @responsive", async ({ page }) => {
  const errors = await open(page);
  const trigger = page.getByRole("combobox", { name: /^Delivery site/ }).first();
  await expect(trigger).toHaveAccessibleName(/Australia \/ New South Wales \/ Parramatta depot/);
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("searchbox", { name: "Search", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const chosen = page.getByRole("menuitemradio", { name: "Parramatta depot" });
  await expect(chosen).toBeFocused();
  await expect(chosen).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("menuitem", { name: "New South Wales" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Victoria" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("menuitemradio", { name: "Dandenong depot" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(valueLine(page)).toHaveText('value: ["au","vic","geelong"]');
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test("mouse, a lazy level and search by full path", async ({ page }) => {
  await open(page);
  const trigger = page.getByRole("combobox", { name: /^Delivery site/ }).first();
  await trigger.click();
  await page.getByRole("menuitem", { name: "New Zealand" }).click();
  await expect(page.getByRole("menuitem", { name: "Auckland" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Auckland" }).click();
  await page.getByRole("menuitemradio", { name: "Penrose yard" }).click();
  await expect(valueLine(page)).toHaveText('value: ["nz","auckland","penrose"]');
  await trigger.click();
  await page.getByRole("searchbox", { name: "Search", exact: true }).fill("yard");
  const results = page.getByRole("listbox", { name: "Search" });
  await expect(results.getByRole("option")).toHaveCount(4);
  await expect(results.getByRole("option").first()).toHaveText("Australia / New South Wales / Newcastle yard");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(valueLine(page)).toHaveText('value: ["au","nsw","newcastle"]');
});

test("multiple: checking a level checks what is under it; changeOnSelect chooses a level", async ({ page }) => {
  await open(page);
  await page.getByRole("combobox", { name: /^Coverage/ }).click();
  await expect(page.getByRole("menuitemcheckbox", { name: "Australia" })).toHaveAttribute("aria-checked", "mixed");
  await page.getByRole("menuitemcheckbox", { name: "Victoria" }).focus();
  await page.keyboard.press(" ");
  // Ballarat is disabled and keeps its state, so Victoria lists its other sites.
  await expect(valueLine(page, 1)).toHaveText('value: [["au","nsw"],["au","vic","dandenong"],["au","vic","geelong"],["sg","jurong"]]');
  await expect(page.getByRole("menuitemcheckbox", { name: "Victoria" })).toHaveAttribute("aria-checked", "mixed");
  await page.keyboard.press("Escape");
  const area = page.getByRole("combobox", { name: /^Service area/ });
  await expect(area).toHaveAccessibleName(/Australia \/ Victoria/);
  await area.click();
  await page.getByRole("menuitemradio", { name: "Singapore" }).click();
  await expect(area).toHaveAccessibleName(/Singapore$/);
});

test("the trigger drops middle levels in a narrow box", async ({ page }) => {
  await open(page);
  const narrow = page.locator("[data-lab-frame]").filter({ has: page.locator(".fa-cascader-segment[data-ellipsis]") }).first();
  await expect(narrow).toBeVisible();
  await expect(narrow.getByRole("combobox")).toHaveAccessibleName(/Australia \/ New South Wales \/ Wollongong store/);
  // The last level keeps its place at the end; nothing spills out of the box.
  const box = (await narrow.getByRole("combobox").boundingBox())!;
  const last = (await narrow.locator(".fa-cascader-segment[data-last]").boundingBox())!;
  expect(last.x + last.width).toBeLessThanOrEqual(box.x + box.width);
});

test("passes axe with the columns and the search open", async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include("#examples").analyze();
  expect(result.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
  await page.getByRole("combobox", { name: /^Coverage/ }).click();
  expect((await new AxeBuilder({ page }).include("[role='dialog']").analyze()).violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: /^Delivery site/ }).first().click();
  await page.getByRole("searchbox", { name: "Search", exact: true }).fill("depot");
  expect((await new AxeBuilder({ page }).include("[role='dialog']").analyze()).violations.map((v) => v.id)).toEqual([]);
});

test("on a phone the levels are one list with Back @responsive", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout");
  await open(page);
  const trigger = page.getByRole("combobox", { name: /^Delivery site/ }).first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.tap();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-layout", "list");
  await expect(dialog.getByRole("menu")).toHaveCount(1);
  const back = dialog.getByRole("button", { name: "Back" });
  const listTop = (await dialog.getByRole("menu").boundingBox())!.y;
  await back.tap();
  await expect(dialog.getByRole("menuitem", { name: "Victoria" })).toBeVisible();
  // Drilling up keeps the list where it was: the Back row is always there.
  expect((await dialog.getByRole("menu").boundingBox())!.y).toBe(listTop);
  await dialog.getByRole("menuitem", { name: "Queensland" }).tap();
  await dialog.getByRole("menuitemradio", { name: "Brisbane hub" }).tap();
  await expect(dialog).toBeHidden();
  const box = (await page.getByRole("combobox", { name: /^Delivery site/ }).first().boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});
