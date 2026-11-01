import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced" })));
  await page.goto("./components/tree");
  await expect(page.getByTestId("tree-project").getByRole("treeitem").first()).toBeVisible();
});

const project = (page: Page) => page.getByTestId("tree-project");
const row = (page: Page, id: string) => project(page).locator(`[data-row-id="${id}"]`);
const log = (page: Page) => page.getByTestId("tree-project-log");
const selected = (page: Page) => page.getByTestId("tree-project-selected");

test("multi-select: clicks, modifiers, ranges and keys, with aria-selected on each row", async ({ page }) => {
  await expect(project(page).getByRole("tree")).toHaveAttribute("aria-multiselectable", "true");
  await row(page, "brief/scope").click();
  await expect(selected(page)).toHaveText("brief/scope");
  await row(page, "notes").click({ modifiers: ["ControlOrMeta"] });
  await expect(selected(page)).toHaveText("brief/scope, notes");
  await expect(row(page, "notes")).toHaveAttribute("aria-selected", "true");
  await row(page, "brief/timeline").click({ modifiers: ["Shift"] });
  await expect(row(page, "surveys/north")).toHaveAttribute("aria-selected", "true");

  await row(page, "notes").click();
  await page.keyboard.press("Shift+ArrowUp");
  await expect(row(page, "locked")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Space");
  await expect(row(page, "locked")).toHaveAttribute("aria-selected", "false");
  await page.keyboard.press("ControlOrMeta+a");
  await expect.poll(async () => (await selected(page).innerText()).split(", ").length).toBe(6);
});

test("rename keeps focus in the field, Enter commits, Escape cancels and focus returns", async ({ page }) => {
  await row(page, "notes").click();
  await page.keyboard.press("F2");
  const field = project(page).getByRole("textbox", { name: "Rename notes.md" });
  await expect(field).toBeFocused();
  await page.keyboard.type("minutes");
  await page.keyboard.press("Escape");
  await expect(field).toHaveCount(0);
  await expect(row(page, "notes")).toContainText("notes.md");
  await expect(row(page, "notes")).toBeFocused();

  await page.keyboard.press("F2");
  await expect(field).toBeFocused();
  // Scrolling and arrow keys stay in the field.
  await page.keyboard.press("ArrowLeft");
  await expect(field).toBeFocused();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("a/b");
  await page.keyboard.press("Enter");
  await expect(project(page).getByRole("alert")).toHaveText("A name can't contain a slash");
  await expect(field).toBeFocused();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("minutes.md");
  await page.keyboard.press("Enter");
  await expect(log(page)).toHaveText("Renamed to minutes.md");
  await expect(row(page, "notes")).toContainText("minutes.md");
  await expect(row(page, "notes")).toBeFocused();
});

test("Alt and the arrows move a row and keep focus on it", async ({ page }) => {
  await row(page, "brief/scope").click();
  await page.keyboard.press("Alt+ArrowDown");
  await expect(log(page)).toContainText("brief/scope to brief at 1 by keyboard");
  await expect(row(page, "brief/scope")).toBeFocused();
  await page.keyboard.press("Alt+ArrowLeft");
  await expect(log(page)).toContainText("brief/scope to top level at 1 by keyboard");
  await expect(row(page, "brief/scope")).toBeFocused();
  await expect(row(page, "brief/scope")).toHaveAttribute("aria-level", "1");
  // Into the branch above: Brief.
  await page.keyboard.press("Alt+ArrowRight");
  await expect(row(page, "brief/scope")).toHaveAttribute("aria-level", "2");
});

test("a Move menu is the single-pointer route", async ({ page }) => {
  await row(page, "surveys/south").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Move up" }).click();
  await expect(log(page)).toContainText("surveys/south to surveys at 0 by menu");
  await row(page, "surveys/south").click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Move up" })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
});

test("drag moves into a branch and between rows, with the selection", async ({ page }) => {
  await project(page).scrollIntoViewIfNeeded();
  await row(page, "brief/scope").click();
  await row(page, "brief/budget").click({ modifiers: ["ControlOrMeta"] });
  const from = (await row(page, "brief/scope").boundingBox())!;
  const into = (await row(page, "surveys").boundingBox())!;
  await page.mouse.move(from.x + 90, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 90, from.y + from.height / 2 + 14, { steps: 4 });
  await page.mouse.move(into.x + 90, into.y + into.height / 2, { steps: 10 });
  await expect(row(page, "surveys")).toHaveAttribute("data-drop-inside", "");
  await page.mouse.up();
  await expect(log(page)).toContainText("brief/scope, brief/budget to surveys at 2 by pointer");
  await expect(row(page, "brief/scope")).toHaveAttribute("aria-level", "2");
});

test("a dragged row cannot go into itself or a place canMove refuses", async ({ page }) => {
  await project(page).scrollIntoViewIfNeeded();
  const from = (await row(page, "surveys").boundingBox())!;
  const child = (await row(page, "surveys/north").boundingBox())!;
  await page.mouse.move(from.x + 90, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(child.x + 90, child.y + 6, { steps: 8 });
  await page.mouse.up();
  await expect(log(page)).toHaveText("No change yet");
});

test("reveal opens, loads and pages to a row that was not loaded", async ({ page }) => {
  const reveal = page.getByTestId("tree-reveal");
  await reveal.getByRole("button", { name: "Reveal Zephyr" }).click();
  await expect(page.getByTestId("tree-reveal-result")).toHaveText("Found Zephyr", { timeout: 15_000 });
  await expect(reveal.locator('[data-row-id="studio/fonts/zephyr"]')).toBeFocused();
  await expect(reveal.locator('[data-row-id="studio/fonts/zephyr"]')).toBeInViewport();
});

test("trailing content aligns at the row's end, rows keep their height @responsive", async ({ page }) => {
  const budget = row(page, "brief/budget");
  await expect(budget.locator(".fa-tree-trailing")).toHaveText("86 KB");
  const [rowBox, tail] = [(await budget.boundingBox())!, (await budget.locator(".fa-tree-trailing").boundingBox())!];
  expect(tail.x + tail.width).toBeLessThanOrEqual(rowBox.x + rowBox.width);
  const height = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--item-h"));
  expect(height).not.toBe("");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("rtl: Alt and the reading arrows go into and out of a branch", async ({ page }) => {
  await page.evaluate(() => document.querySelector('[data-testid="tree-project"]')?.setAttribute("dir", "rtl"));
  await row(page, "brief/scope").click();
  await page.keyboard.press("Alt+ArrowRight");
  await expect(log(page)).toContainText("brief/scope to top level");
});

test("passes axe with selection, marks, trailing content and a rename field @responsive", async ({ page }) => {
  await row(page, "notes").click();
  await page.keyboard.press("F2");
  const result = await new AxeBuilder({ page }).include('[data-testid="tree-project"]').analyze();
  expect(result.violations).toEqual([]);
});
