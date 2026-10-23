import { expect, test, type Locator } from "@playwright/test";

/*
 * SplitPane: drag or keys resize within each pane's limits, Enter hides the pane that gives
 * way, the size is remembered, and a narrow split hides that pane behind a button that shows
 * it over the other.
 */

const startSize = (split: Locator) =>
  split.locator('[data-pane="start"]').evaluate((element) => Math.round(element.getBoundingClientRect().width));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" }));
  });
  await page.goto("/components/split-pane");
  await page.evaluate(() => localStorage.removeItem("glass-ux.gallery.split-pane"));
  await page.reload();
  await expect(page.getByTestId("split-explorer").getByRole("separator")).toBeVisible({ timeout: 30_000 });
});

test("the divider resizes by drag and keys within the panes' limits, and remembers", async ({ page }) => {
  const split = page.getByTestId("split-explorer");
  await split.scrollIntoViewIfNeeded();
  const separator = split.getByRole("separator", { name: "Resize Folders" });
  await expect(separator).toHaveAttribute("aria-orientation", "vertical");
  const initial = await startSize(split);
  const box = (await separator.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 40, { steps: 5 });
  await page.mouse.up();
  const dragged = await startSize(split);
  expect(dragged).toBeGreaterThan(initial + 80);
  await separator.focus();
  await page.keyboard.press("ArrowLeft");
  expect(await startSize(split)).toBeLessThan(dragged);
  await page.keyboard.press("Home");
  const min = await startSize(split);
  await page.keyboard.press("End");
  const max = await startSize(split);
  // startMin 10rem; the values pane keeps endMin 14rem.
  expect(min).toBe(160);
  const total = await split.locator(".fa-split").evaluate((element) => element.getBoundingClientRect().width);
  expect(total - max).toBeGreaterThanOrEqual(224);
  await page.reload();
  await expect(split.getByRole("separator")).toBeVisible();
  expect(await startSize(split)).toBe(max);
});

test("Enter hides the folders behind a rail button that shows them again", async ({ page }) => {
  const split = page.getByTestId("split-explorer");
  await split.scrollIntoViewIfNeeded();
  await split.getByRole("separator").focus();
  await page.keyboard.press("Enter");
  await expect(split.locator('[data-pane="start"]')).toBeHidden();
  await split.getByRole("button", { name: "Show Folders" }).click();
  await expect(split.locator('[data-pane="start"]')).toBeVisible();
  await expect(split.getByRole("separator")).toBeVisible();
});

test("a narrow split shows the folders over the values from its rail", async ({ page }) => {
  const split = page.getByTestId("split-narrow");
  await split.scrollIntoViewIfNeeded();
  await expect(split.locator('[data-pane="start"]')).toBeHidden();
  await expect(split.getByRole("separator")).toHaveCount(0);
  const show = split.getByRole("button", { name: "Show Folders" });
  await expect(show).toHaveAttribute("aria-expanded", "false");
  await show.click();
  await expect(split.locator('[data-pane="start"]')).toBeVisible();
  await expect(split.getByRole("button", { name: "Hide Folders" })).toHaveAttribute("aria-expanded", "true");
  await split.getByRole("tree", { name: "Folders" }).focus();
  await page.keyboard.press("Escape");
  await expect(split.locator('[data-pane="start"]')).toBeHidden();
});

test("a vertical split moves with the up and down arrows", async ({ page }) => {
  const split = page.getByTestId("split-vertical");
  await split.scrollIntoViewIfNeeded();
  const separator = split.getByRole("separator");
  await expect(separator).toHaveAttribute("aria-orientation", "horizontal");
  const height = () => split.locator('[data-pane="start"]').evaluate((element) => element.getBoundingClientRect().height);
  const before = await height();
  await separator.focus();
  await page.keyboard.press("ArrowDown");
  expect(await height()).toBeGreaterThan(before);
});
