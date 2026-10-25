import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * TransferList: checkbox selection (click, Shift-click, keyboard), moving selected and all,
 * disabled items with their reason, counts, a virtualised 5,000-row list, keyboard
 * reordering, and stacked lists with turned buttons in a narrow box.
 */

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })),
  );
  await page.goto("/components/transfer-list");
  const group = page.getByRole("group", { name: "Technician permissions" });
  await expect(group).toBeVisible({ timeout: 30_000 });
  return { group, errors };
}

const valueLine = (page: Page) => page.locator("#examples").getByText(/^value: /).first();

test("mouse: check, Shift-click a range, move selected, and disabled items stay with their reason @responsive", async ({ page }) => {
  const { group, errors } = await open(page);
  const available = group.getByRole("listbox", { name: "Not granted" });
  const granted = group.getByRole("listbox", { name: "Granted" });
  await available.getByRole("option", { name: /^Edit assets/ }).click();
  await available.getByRole("option", { name: /^Import assets/ }).click({ modifiers: ["Shift"] });
  await expect(available.getByRole("option", { selected: true })).toHaveCount(3);
  await expect(group.getByText("3 of 11 selected")).toBeVisible();
  await group.getByRole("button", { name: "Move selected to Granted" }).click();
  await expect(valueLine(page)).toHaveText('value: ["assets.view","orders.view","admin.billing","assets.edit","assets.retire","assets.import"]');
  await expect(group.getByText("6 items")).toBeVisible();
  // A disabled item cannot be selected and says why.
  const billing = granted.getByRole("option", { name: /^Manage billing/ });
  await expect(billing).toHaveAttribute("aria-disabled", "true");
  await expect(billing).toHaveAttribute("aria-description", "Billing is managed by the parent organisation");
  await billing.click({ force: true });
  await expect(billing).toHaveAttribute("aria-selected", "false");
  // Move all keeps disabled items where they are.
  await group.getByRole("button", { name: "Move all to Not granted" }).click();
  await expect(valueLine(page)).toHaveText('value: ["admin.billing"]');
  expect(errors).toEqual([]);
});

test("keyboard: arrows, Shift+arrow, Space, Ctrl+A, Enter moves, Esc clears", async ({ page }) => {
  const { group } = await open(page);
  const available = group.getByRole("listbox", { name: "Not granted" });
  await group.getByRole("searchbox", { name: "Search Not granted" }).fill("orders");
  await expect(available.getByRole("option")).toHaveCount(3);
  await available.getByRole("option").first().focus();
  await page.keyboard.press(" ");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(available.getByRole("option", { selected: true })).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(available.getByRole("option", { selected: true })).toHaveCount(0);
  await page.keyboard.press("Control+a");
  await expect(available.getByRole("option", { selected: true })).toHaveCount(3);
  await page.keyboard.press("Enter");
  await expect(valueLine(page)).toHaveText('value: ["assets.view","orders.view","admin.billing","orders.create","orders.approve","orders.close"]');
  await expect(group.getByText("No match for “orders”")).toBeVisible();
});

test("a 5,000-item list renders only the rows on screen and searches all of them", async ({ page }) => {
  await open(page);
  const people = page.getByRole("listbox", { name: "People" });
  await people.scrollIntoViewIfNeeded();
  expect(await people.getByRole("option").count()).toBeLessThan(60);
  await page.getByRole("searchbox", { name: "Search People" }).fill("m4999");
  await expect(people.getByRole("option")).toHaveCount(1);
  await people.getByRole("option").dblclick();
  await expect(page.getByRole("listbox", { name: "Members" }).getByRole("option")).toHaveCount(4);
});

test("orderable: Alt+arrow moves the focused row and announces its place", async ({ page }) => {
  await open(page);
  const shown = page.getByRole("listbox", { name: "Shown, in order" });
  await shown.scrollIntoViewIfNeeded();
  await shown.getByRole("option", { name: /^Approve work orders/ }).focus();
  await page.keyboard.press("Alt+ArrowDown");
  await expect(shown.getByRole("option").nth(1)).toHaveAccessibleName(/^Approve work orders/);
  await expect(shown.getByRole("option").nth(1)).toBeFocused();
  await expect(page.getByText("Approve work orders, position 2 of 3")).toBeAttached();
});

test("passes axe; in a narrow box the lists stack and the buttons turn @responsive", async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include("#examples").analyze();
  expect(result.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
  const narrow = page.locator("[data-lab-frame]").filter({ has: page.getByRole("group", { name: "Permissions" }) }).last();
  await narrow.scrollIntoViewIfNeeded();
  const panes = narrow.locator(".fa-transfer-pane");
  const [a, b] = [(await panes.nth(0).boundingBox())!, (await panes.nth(1).boundingBox())!];
  expect(b.y).toBeGreaterThan(a.y + a.height - 1);
  const rotate = await narrow.locator(".fa-transfer-move svg").first().evaluate((icon) => getComputedStyle(icon).rotate);
  expect(rotate).toBe("90deg");
});
