import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * TreeSelect: a Field names the trigger; the tree follows the ARIA tree pattern inside the
 * popup (search ↓ into the tree, arrows, Space checks, Esc returns focus); check strategies
 * report the value; lazy branches load and retry; the popup fits a phone.
 */

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })),
  );
  await page.goto("/components/tree-select");
  await expect(page.getByRole("combobox", { name: /^Reports to/ })).toBeVisible({ timeout: 30_000 });
  return errors;
}

const valueLine = (page: Page) => page.locator("#examples").getByText(/^value: /).first();

test("single: keyboard opens the tree, arrows move, Enter chooses and focus returns", async ({ page }) => {
  const errors = await open(page);
  const trigger = page.getByRole("combobox", { name: /^Reports to/ });
  await expect(trigger).toHaveAccessibleName("Reports to Kenji Arai");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  const search = page.getByRole("searchbox", { name: "Search", exact: true });
  await expect(search).toBeFocused();
  // ↓ enters the tree on the chosen node.
  await page.keyboard.press("ArrowDown");
  const tree = page.getByRole("tree");
  await expect(tree.getByRole("treeitem", { name: /Kenji Arai/ })).toBeFocused();
  await expect(tree.getByRole("treeitem", { name: /Kenji Arai/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowDown");
  await expect(tree.getByRole("treeitem", { name: /Sofia Marchetti/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(tree).toBeHidden();
  await expect(trigger).toHaveAccessibleName("Reports to Sofia Marchetti");
  await expect(trigger).toBeFocused();
  // ← closes a group and returns to the parent; Esc closes and focus goes back.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("treeitem", { name: /^Firmware/ })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("treeitem", { name: /^Firmware/ })).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test("multiple: checking reports the value by strategy, typing searches and chips fold", async ({ page }) => {
  const errors = await open(page);
  const trigger = page.getByRole("combobox", { name: /^Notify/ });
  await trigger.click();
  const tree = page.getByRole("tree");
  await expect(tree).toHaveAttribute("aria-multiselectable", "true");
  await expect(tree.getByRole("treeitem", { name: /^Engineering/ })).toHaveAttribute("aria-checked", "mixed");
  // Checking Sofia completes Firmware: parent strategy lists the branch.
  await tree.getByRole("treeitem", { name: /Sofia Marchetti/ }).click();
  await expect(valueLine(page)).toHaveText('value: ["platform","firmware"]');
  await expect(tree.getByRole("treeitem", { name: /^Firmware/ })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  // child strategy rewrites the same choice as people.
  await page.getByRole("button", { name: "child", exact: true }).click();
  await trigger.click();
  await tree.getByRole("treeitem", { name: /Sofia Marchetti/ }).focus();
  await page.keyboard.press(" ");
  await expect(valueLine(page)).toHaveText('value: ["p-amara","p-lukas","p-ines","p-kenji"]');
  // Typing in the tree goes to the search; matches keep their ancestors, highlighted.
  await page.keyboard.type("ravi");
  await expect(page.getByRole("searchbox", { name: "Search", exact: true })).toHaveValue("ravi");
  await expect(tree.getByRole("treeitem")).toHaveCount(4);
  await expect(tree.locator("mark")).toHaveText("Ravi");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  // One line folds the rest into +N with the names for assistive technology.
  const oneLine = page.getByRole("combobox", { name: /^One line/ });
  const overflow = oneLine.locator(".fa-select-value [data-overflow]");
  await expect(overflow).toContainText(/\+\d/);
  await expect(overflow.locator(".sr-only")).toContainText("more:");
  expect(errors).toEqual([]);
});

test("lazy branches load on open and retry after a failure", async ({ page }) => {
  await open(page);
  await page.getByRole("combobox", { name: /^Apply to devices/ }).click();
  const tree = page.getByRole("tree");
  await tree.getByRole("treeitem", { name: /^Plant floor/ }).click({ position: { x: 14, y: 10 } });
  await expect(tree.getByRole("treeitem", { name: /PLC-101/ })).toBeVisible();
  await tree.getByRole("treeitem", { name: /^Test lab/ }).click({ position: { x: 14, y: 10 } });
  const retry = tree.getByRole("treeitem", { name: /Couldn't load · Retry/ });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(tree.getByRole("treeitem", { name: /RIG-101/ })).toBeVisible();
});

test("a bound field shows its error in place and the page passes axe", async ({ page }) => {
  await open(page);
  const owner = page.getByRole("combobox", { name: /^Owner/ });
  const watchers = page.getByRole("combobox", { name: /^Watchers/ });
  const gap = async () => (await watchers.boundingBox())!.y - (await owner.boundingBox())!.y;
  await owner.scrollIntoViewIfNeeded();
  const before = await gap();
  const form = page.getByRole("form", { name: "Asset ownership" });
  // Validation runs when the field is left (blur, then change).
  await owner.focus();
  await page.keyboard.press("Tab");
  await expect(form.getByText("Choose an owner")).toBeVisible();
  await expect(owner).toHaveAttribute("aria-invalid", "true");
  // The message line was reserved: the next field did not move.
  expect(await gap()).toBe(before);
  const result = await new AxeBuilder({ page }).include("#examples").analyze();
  expect(result.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
  await page.getByRole("combobox", { name: /^Notify/ }).click();
  const popup = await new AxeBuilder({ page }).include("[role='dialog']").analyze();
  expect(popup.violations.map((violation) => violation.id)).toEqual([]);
});

test("the popup fits a phone and its rows never run under the footer @responsive", async ({ page }) => {
  await open(page);
  const trigger = page.getByRole("combobox", { name: /^Notify/ });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  const box = (await dialog.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  const scroll = (await dialog.locator(".fa-tree-select-scroll").boundingBox())!;
  const footer = (await dialog.locator(".fa-tree-select-footer").boundingBox())!;
  expect(scroll.y + scroll.height).toBeLessThanOrEqual(footer.y + 1);
  // Searching does not move the search field or the footer.
  const search = page.getByRole("searchbox", { name: "Search", exact: true });
  const searchBefore = await dialog.locator(".fa-tree-select-search").boundingBox();
  await search.fill("zzz");
  await expect(dialog.getByText("No match for “zzz”")).toBeVisible();
  expect(await dialog.locator(".fa-tree-select-search").boundingBox()).toEqual(searchBefore);
  expect(await dialog.locator(".fa-tree-select-footer").boundingBox()).toEqual(footer);
});
