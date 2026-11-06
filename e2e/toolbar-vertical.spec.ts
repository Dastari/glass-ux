import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/*
 * Vertical Toolbar, single-choice groups and flyouts. A tool rail is a vertical toolbar whose
 * group is a radiogroup: Up and Down Arrow move focus, Space or Enter chooses, exactly one tool is
 * chosen. A flyout opens beside the rail (mirrored in RTL) on a hold or Right Arrow, below a row's
 * button on Arrow Down. Horizontal toolbars are unchanged (toolbar.spec.ts).
 */

async function open(page: Page, dir: "ltr" | "rtl" = "ltr") {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })),
  );
  await page.goto(dir === "rtl" ? "/components/toolbar?dir=rtl&lang=ar" : "/components/toolbar");
  await expect(page.getByRole("toolbar", { name: "Tools" }).first()).toBeVisible({ timeout: 30_000 });
  if (dir === "rtl") await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
}

const rail = (page: Page) => page.getByRole("toolbar", { name: "Tools" }).first();

test("Up and Down move between tools; Space chooses; exactly one is checked", async ({ page }) => {
  await open(page);
  const bar = rail(page);
  await expect(bar).toHaveAttribute("aria-orientation", "vertical");
  const group = bar.getByRole("radiogroup", { name: "Tool" });
  const checked = () => group.locator('[role="radio"][aria-checked="true"]');
  await expect(checked()).toHaveCount(1);
  await expect(bar.getByRole("radio", { name: "Move" })).toHaveAttribute("aria-checked", "true");
  await bar.getByRole("radio", { name: "Move" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(bar.getByRole("radio", { name: "Select" })).toBeFocused();
  // Passing over a tool never chooses it.
  await expect(bar.getByRole("radio", { name: "Move" })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Space");
  await expect(bar.getByRole("radio", { name: "Select" })).toHaveAttribute("aria-checked", "true");
  await expect(checked()).toHaveCount(1);
  await page.keyboard.press("ArrowUp");
  await expect(bar.getByRole("radio", { name: "Move" })).toBeFocused();
  // Choosing the chosen tool again keeps it chosen.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(bar.getByRole("radio", { name: "Select" })).toHaveAttribute("aria-checked", "true");
  // One tab stop: Tab leaves the rail.
  await page.keyboard.press("Tab");
  await expect(bar.locator(":focus")).toHaveCount(0);
});

for (const dir of ["ltr", "rtl"] as const)
  test(`the flyout opens beside the rail at the inline end and Escape returns focus (${dir})`, async ({ page }) => {
    await open(page, dir);
    const bar = rail(page);
    const flyout = bar.getByRole("radio", { name: "Brush" });
    await flyout.focus();
    await page.keyboard.press(dir === "ltr" ? "ArrowRight" : "ArrowLeft");
    const menu = page.getByRole("menu", { name: "Brush tools" });
    await expect(menu).toBeVisible();
    const button = (await flyout.boundingBox())!;
    const popup = (await menu.boundingBox())!;
    if (dir === "ltr") expect(popup.x).toBeGreaterThanOrEqual(button.x + button.width - 1);
    else expect(popup.x + popup.width).toBeLessThanOrEqual(button.x + 1);
    // The first Arrow Down highlights the first tool, the second the next.
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(bar.getByRole("radio", { name: "Pencil" })).toHaveAttribute("aria-checked", "true");
    await expect(bar.getByRole("radio", { name: "Pencil" })).toBeFocused();
    await page.keyboard.press(dir === "ltr" ? "ArrowRight" : "ArrowLeft");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(bar.getByRole("radio", { name: "Pencil" })).toBeFocused();
    // The wrong-direction arrow does not open it.
    await page.keyboard.press(dir === "ltr" ? "ArrowLeft" : "ArrowRight");
    await expect(menu).toBeHidden();
  });

test("a long press opens the flyout without choosing, and a press chooses the shown tool", async ({ page }) => {
  await open(page);
  const bar = rail(page);
  const flyout = bar.getByRole("radio", { name: "Brush" });
  await flyout.hover();
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expect(page.getByRole("menu", { name: "Brush tools" })).toBeVisible();
  await expect(flyout).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Escape");
  await flyout.click();
  await expect(flyout).toHaveAttribute("aria-checked", "true");
});

test("a vertical toolbar given little height folds low-priority tools into More, opening at the inline end", async ({ page }) => {
  await open(page);
  const bar = page.getByRole("toolbar", { name: "Tools" }).nth(1);
  await bar.scrollIntoViewIfNeeded();
  await expect(bar.getByRole("radio", { name: "Text" })).toBeHidden();
  const more = bar.getByRole("button", { name: "More" });
  await expect(more).toBeVisible();
  const overflow = await bar.evaluate((element) => element.scrollHeight - element.clientHeight);
  expect(overflow).toBeLessThanOrEqual(1);
  await more.click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitemradio", { name: "Text" })).toBeVisible();
  const trigger = (await more.boundingBox())!;
  expect((await menu.boundingBox())!.x).toBeGreaterThanOrEqual(trigger.x + trigger.width - 1);
  await menu.getByRole("menuitemradio", { name: "Text" }).click();
  await page.keyboard.press("Escape");
});

test("a single-choice group folds one tool at a time, and the chosen tool stays showing", async ({ page }) => {
  await open(page);
  const bar = page.getByRole("toolbar", { name: "Tools" }).nth(1);
  await bar.scrollIntoViewIfNeeded();
  // Too short for every tool: the group stays, and only its last tools go.
  await expect(bar.getByRole("radiogroup", { name: "Tool" })).toBeVisible();
  await expect(bar.getByRole("radio", { name: "Move" })).toBeVisible();
  await expect(bar.getByRole("radio", { name: "Move" })).toHaveAttribute("aria-checked", "true");
  await expect(bar.getByRole("radio", { name: "Text" })).toBeHidden();
  const more = bar.getByRole("button", { name: "More" });
  await more.click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitemradio", { name: "Move" })).toHaveCount(0);
  await menu.getByRole("menuitemradio", { name: "Text" }).click();
  // Chosen from More, it comes back into the row, and a tool before it gives up its place.
  const text = bar.getByRole("radio", { name: "Text" });
  await expect(text).toBeVisible();
  await expect(text).toHaveAttribute("aria-checked", "true");
  await expect(bar.getByRole("radio", { name: "Move" })).toBeVisible();
  expect(await bar.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
  await more.click();
  await expect(page.getByRole("menu").getByRole("menuitemradio", { name: "Text" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  // Arrow keys pass over folded tools to the next one showing.
  await bar.getByRole("radio", { name: "Move" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(text).toBeFocused();
});

test("the row version opens its flyout with Arrow Down", async ({ page }) => {
  await open(page);
  const row = page.getByRole("toolbar", { name: "Row tools" });
  await row.scrollIntoViewIfNeeded();
  await row.getByRole("radio", { name: "Brush" }).focus();
  await page.keyboard.press("ArrowDown");
  const menu = page.getByRole("menu", { name: "Row brush tools" });
  await expect(menu).toBeVisible();
  const button = (await row.getByRole("radio", { name: "Brush" }).boundingBox())!;
  expect((await menu.boundingBox())!.y).toBeGreaterThanOrEqual(button.y + button.height - 1);
  await page.keyboard.press("Escape");
});

test("the rail passes axe", async ({ page }) => {
  await open(page);
  const results = await new AxeBuilder({ page }).include('[aria-label="Tools"]').analyze();
  expect(results.violations).toEqual([]);
});
