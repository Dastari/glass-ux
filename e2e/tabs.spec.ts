import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced" })));
  await page.goto("./components/tabs");
  await expect(page.getByTestId("tabs-documents").getByRole("tab").first()).toBeVisible();
});

const order = (scope: Locator) => scope.getByRole("tab").evaluateAll((tabs) => tabs.map((tab) => tab.getAttribute("data-value")));

async function drag(page: Page, from: Locator, to: { x: number; y: number }) {
  const box = (await from.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.waitForTimeout(120);
  await page.mouse.up();
}

test("close: Delete, the mark, a middle-click and the real button", async ({ page }) => {
  const strip = page.getByTestId("tabs-documents");
  const budget = strip.getByRole("tab", { name: "Budget review Unsaved changes" });
  await expect(budget).toHaveAttribute("aria-selected", "true");
  await budget.focus();
  await page.keyboard.press("Delete");
  await expect(budget).toHaveCount(0);
  // Its neighbour takes selection and focus.
  const minutes = strip.getByRole("tab", { name: "Minutes Preview" });
  await expect(minutes).toHaveAttribute("aria-selected", "true");
  await expect(minutes).toBeFocused();

  await minutes.click({ button: "middle" });
  await expect(minutes).toHaveCount(0);
  const survey = strip.getByRole("tab", { name: "Harbour survey" });
  await survey.hover();
  await survey.locator(".fa-tab-close").click();
  await expect(survey).toHaveCount(0);
  await expect(strip.getByRole("tab")).toHaveCount(1);
});

test("Shift and the arrows reorder in place with focus held; the menu does the same", async ({ page }) => {
  const strip = page.getByTestId("tabs-documents");
  const survey = strip.getByRole("tab", { name: "Harbour survey" });
  await survey.focus();
  await page.keyboard.press("Shift+ArrowRight");
  await expect.poll(() => order(strip)).toEqual(["budget", "survey", "minutes", "summary"]);
  await expect(survey).toBeFocused();
  await expect(survey).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Shift+End");
  await expect.poll(() => order(strip)).toEqual(["budget", "minutes", "summary", "survey"]);
  await expect(page.getByTestId("tabs-log")).toContainText("survey to 3 by keyboard");

  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "Move earlier" }).click();
  await expect.poll(() => order(strip)).toEqual(["budget", "minutes", "survey", "summary"]);
  await expect(page.getByTestId("tabs-log")).toContainText("survey to 2 by menu");
});

test("a context menu holds the item's rows, Keep open and a double-click end a preview", async ({ page }) => {
  const strip = page.getByTestId("tabs-documents");
  const minutes = strip.getByRole("tab", { name: "Minutes Preview" });
  await minutes.click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Copy link" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Keep open" }).click();
  await expect(strip.getByRole("tab", { name: "Minutes", exact: true })).toBeVisible();
});

test("drag reorders within a strip, reporting one pointer move", async ({ page }) => {
  const strip = page.getByTestId("tabs-documents");
  await strip.scrollIntoViewIfNeeded();
  const summary = (await strip.getByRole("tab", { name: "Summary" }).boundingBox())!;
  await drag(page, strip.getByRole("tab", { name: "Harbour survey" }), { x: summary.x + summary.width - 4, y: summary.y + summary.height / 2 });
  await expect.poll(() => order(strip)).toEqual(["budget", "minutes", "summary", "survey"]);
  await expect(page.getByTestId("tabs-log")).toContainText("survey to 3 by pointer");
});

test("a tab crosses strips, takes focus there and sets aria-controls; a DropZone takes one too", async ({ page }) => {
  const left = page.getByTestId("tabs-strip-left");
  const right = page.getByTestId("tabs-strip-right");
  await page.getByTestId("tabs-dock").scrollIntoViewIfNeeded();
  await left.getByRole("tab", { name: "Agenda" }).click();
  await expect(left.getByRole("tab", { name: "Agenda" })).toHaveAttribute("aria-controls", "panel-left-agenda");
  await expect(page.locator("#panel-left-agenda")).toBeVisible();
  const target = (await right.locator(".fa-tabs-bar").boundingBox())!;
  await drag(page, left.getByRole("tab", { name: "Agenda" }), { x: target.x + target.width - 8, y: target.y + target.height / 2 });
  await expect.poll(() => order(right)).toEqual(["right-notes", "right-files", "left-agenda"]);
  await expect(left.getByRole("tab", { name: "Agenda" })).toHaveCount(0);
  await expect(right.getByRole("tab", { name: "Agenda" })).toBeFocused();

  const dock = (await page.getByTestId("tabs-dock").boundingBox())!;
  await drag(page, right.getByRole("tab", { name: "Files" }), { x: dock.x + dock.width / 2, y: dock.y + dock.height / 2 });
  await expect(page.getByTestId("tabs-dock")).toContainText("right-files from right");
  await expect(right.getByRole("tab", { name: "Files" })).toHaveCount(0);
});

test("overflow keeps the active tab; a drop past the last visible tab lands at the very end", async ({ page }) => {
  const left = page.getByTestId("tabs-strip-left");
  const right = page.getByTestId("tabs-strip-right");
  await expect(left.getByRole("tab", { name: "Contacts" })).toBeVisible();
  await expect(left.getByRole("button", { name: /More tabs/ })).toBeVisible();
  await page.getByTestId("tabs-dock").scrollIntoViewIfNeeded();
  const bar = (await left.locator(".fa-tabs-bar").boundingBox())!;
  await drag(page, right.getByRole("tab", { name: "Files" }), { x: bar.x + bar.width - 6, y: bar.y + bar.height / 2 });
  // The host activates what it receives, and the active tab stays in the strip (R6.6).
  await expect(left.getByRole("tab", { name: "Files" })).toBeVisible();
  await expect(left.getByRole("tab", { name: "Files" })).toHaveAttribute("aria-selected", "true");
  await expect(left.getByRole("tab", { name: "Files" })).toBeFocused();
  await left.getByRole("button", { name: /More tabs/ }).click();
  await expect(page.getByRole("menuitem").last()).toContainText("Contracts");
  await page.keyboard.press("Escape");
});

test("the close button outside the tablist appears on focus and closes the active tab", async ({ page }) => {
  const strip = page.getByTestId("tabs-documents");
  await strip.getByRole("tab", { name: "Budget review Unsaved changes" }).focus();
  await page.keyboard.press("Tab");
  const close = strip.getByRole("button", { name: "Close Budget review" });
  await expect(close).toBeFocused();
  const box = (await close.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(24);
  await page.keyboard.press("Enter");
  await expect(strip.getByRole("tab", { name: /Budget review/ })).toHaveCount(0);
});

test("hover moves nothing: the marks hold one box @responsive", async ({ page }) => {
  const strip = page.getByTestId("tabs-documents");
  const budget = strip.getByRole("tab", { name: "Budget review Unsaved changes" });
  await strip.scrollIntoViewIfNeeded();
  const before = await budget.boundingBox();
  await budget.hover();
  expect(await budget.boundingBox()).toEqual(before);
});

test("rtl: Shift and the arrows follow the reading direction", async ({ page }) => {
  await page.evaluate(() => document.querySelector('[data-testid="tabs-documents"]')?.setAttribute("dir", "rtl"));
  const strip = page.getByTestId("tabs-documents");
  await strip.getByRole("tab", { name: "Harbour survey" }).focus();
  await page.keyboard.press("Shift+ArrowLeft");
  await expect.poll(() => order(strip)).toEqual(["budget", "survey", "minutes", "summary"]);
});

test("passes axe with marks, a preview and strips that share a provider @responsive", async ({ page }) => {
  const result = await new AxeBuilder({ page }).include('[data-testid="tabs-documents"]').include('[data-testid="tabs-strip-left"]').analyze();
  expect(result.violations).toEqual([]);
});
