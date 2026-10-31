import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function open(page: Page, board = "Service desk") {
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", density: "comfortable", motion: "full" })),
  );
  await page.goto("./components/kanban");
  const region = page.getByRole("region", { name: board, exact: true });
  await expect(region.getByText("Printer offline on level 3")).toBeVisible();
  await region.scrollIntoViewIfNeeded();
  return region;
}

const lane = (board: Locator, column: string) => board.getByRole("list", { name: column, exact: true });
/** The board's own live region (each board has its own drag and drop provider). */
const announcer = (board: Locator) => board.locator("xpath=following-sibling::span[contains(@class,'fa-dnd-announcer')]");
const titles = (list: Locator) => list.locator(".fa-kanban-card-title").allTextContents();

async function carry(page: Page, from: Locator, to: { x: number; y: number }, steps = 16) {
  const box = (await from.boundingBox())!;
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let step = 1; step <= steps; step++) await page.mouse.move(start.x + ((to.x - start.x) * step) / steps, start.y + ((to.y - start.y) * step) / steps);
  await page.waitForTimeout(400);
}

test("drags a card into another column at the place it is dropped", async ({ page }) => {
  const board = await open(page);
  const triage = lane(board, "Triage");
  const card = lane(board, "New").getByRole("group", { name: "Printer offline on level 3" });
  const first = (await triage.locator("li").first().boundingBox())!;
  await carry(page, card, { x: first.x + first.width / 2, y: first.y + 4 });
  await expect(triage).toHaveAttribute("data-drop-over", "");
  await page.mouse.up();
  await expect.poll(() => titles(triage)).toEqual(["Printer offline on level 3", "Shared mailbox not syncing", "Badge reader rejects visitors"]);
  expect(await titles(lane(board, "New"))).toEqual(["New starter laptop for Finance", "VPN drops every few minutes"]);
  await expect(board.getByRole("heading", { name: "Triage" }).locator("xpath=..").locator(".fa-kanban-count > [aria-hidden]")).toHaveText("3");
});

test("a full column refuses a card with its reason and the card goes home", async ({ page }) => {
  const board = await open(page);
  const progress = lane(board, "In progress");
  await expect(board.locator(".fa-kanban-count[data-full] > [aria-hidden]")).toHaveText("3 / 3");
  const box = (await progress.boundingBox())!;
  await carry(page, lane(board, "New").locator("li").first(), { x: box.x + box.width / 2, y: box.y + 40 });
  await expect(progress).toHaveAttribute("data-drop-state", "error");
  await expect(progress).toHaveAttribute("data-drop-reason", "In progress is at its limit of 3");
  await page.screenshot({ path: "test-results/development/kanban-full.png" });
  await page.mouse.up();
  await expect(page.locator(".fa-dnd-ghost")).toHaveCount(0);
  await expect(announcer(board)).toContainText("In progress is at its limit of 3");
  expect(await titles(lane(board, "New"))).toEqual(["Printer offline on level 3", "New starter laptop for Finance", "VPN drops every few minutes"]);
  await expect(progress.locator("li")).toHaveCount(3);
});

test("moves a card with the keyboard and announces each step", async ({ page }) => {
  const board = await open(page);
  const card = lane(board, "New").getByRole("group", { name: "VPN drops every few minutes" });
  await card.focus();
  await page.keyboard.press("Space");
  await expect(announcer(board)).toContainText("Lifted VPN drops every few minutes");
  await page.keyboard.press("ArrowRight");
  await expect(announcer(board)).toContainText("Triage");
  await page.keyboard.press("Space");
  await expect(announcer(board)).toContainText("Dropped VPN drops every few minutes in Triage");
  await expect.poll(() => titles(lane(board, "Triage"))).toContain("VPN drops every few minutes");
  await expect(lane(board, "Triage").getByRole("group", { name: "VPN drops every few minutes" })).toBeFocused();
});

test("a rejected save flies the card back and says why", async ({ page }) => {
  const board = await open(page, "Saving board");
  const card = lane(board, "New").getByRole("group", { name: "Printer offline on level 3" });
  await card.focus();
  await page.keyboard.press("Space");
  for (let step = 0; step < 4; step++) await page.keyboard.press("ArrowRight");
  await expect(announcer(board)).toContainText("Resolved");
  await page.keyboard.press("Space");
  const resolved = lane(board, "Resolved");
  await expect.poll(() => titles(resolved)).toContain("Printer offline on level 3");
  await expect(resolved).toHaveAttribute("data-drop-state", "pending");
  await expect.poll(() => titles(lane(board, "New")), { timeout: 5000 }).toEqual(["Printer offline on level 3", "New starter laptop for Finance", "VPN drops every few minutes"]);
  await expect(resolved).toHaveAttribute("data-drop-state", "error");
  await expect(resolved).toHaveAttribute("data-drop-reason", "Only tickets in progress can be resolved");
  await expect(announcer(board)).toContainText("Only tickets in progress can be resolved");
});

test("collapses a column to a strip that still takes cards, and expands it", async ({ page }) => {
  const board = await open(page);
  await board.getByRole("button", { name: "Collapse Triage" }).click();
  const strip = board.locator("[data-kanban-column='triage'][data-collapsed]");
  await expect(strip).toBeVisible();
  await expect(strip.locator(".fa-kanban-count > [aria-hidden]")).toHaveText("2");
  const box = (await strip.boundingBox())!;
  await carry(page, lane(board, "New").locator("li").first(), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await page.mouse.up();
  await expect(strip.locator(".fa-kanban-count > [aria-hidden]")).toHaveText("3");
  await board.getByRole("button", { name: "Expand Triage" }).click();
  await expect.poll(() => titles(lane(board, "Triage"))).toEqual(["Shared mailbox not syncing", "Badge reader rejects visitors", "Printer offline on level 3"]);
});

test("adds a card from a column's slot", async ({ page }) => {
  const board = await open(page);
  await board.getByRole("button", { name: "Add card to Waiting on requester" }).click();
  await expect.poll(() => titles(lane(board, "Waiting on requester"))).toEqual(["Phone handset buzzes on calls", "New request"]);
});

test("@responsive a narrow board shows one column at a time with a switcher", async ({ page }, info) => {
  await open(page);
  const board = page.getByRole("region", { name: "Narrow board", exact: true });
  await board.scrollIntoViewIfNeeded();
  const scroller = board.locator(".fa-kanban-scroller");
  // The column fills the scroller's content box (its padding is the room for focus rings).
  const width = await scroller.evaluate((element) => {
    const style = getComputedStyle(element);
    return element.clientWidth - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd);
  });
  const column = (await board.locator("[data-kanban-column='new']").boundingBox())!;
  expect(Math.abs(column.width - width)).toBeLessThan(2);
  await board.getByRole("button", { name: "Next column" }).click();
  await expect.poll(async () => (await board.locator("[data-kanban-column='triage']").boundingBox())!.x).toBeLessThan(column.x + 2);
  await expect(board.locator(".fa-kanban-switch")).toContainText("Triage");
  await page.screenshot({ path: `test-results/development/kanban-narrow-${info.project.name}.png` });
});

/** The board's own polite live region for menu moves. */
const status = (board: Locator) => board.locator(":scope > [aria-live='polite']");

test("cards are list items with the drag semantics inside, and the board passes axe", async ({ page }) => {
  const board = await open(page);
  const cards = lane(board, "New").getByRole("listitem");
  await expect(cards).toHaveCount(3);
  // The handle is a named group in the item; nothing interactive nests inside a button.
  await expect(cards.first().getByRole("group", { name: "Printer offline on level 3" })).toHaveAttribute("aria-roledescription", "draggable");
  await expect(lane(board, "New").locator("li[role]")).toHaveCount(0);
  await expect(board.getByRole("heading", { name: "New" }).locator("xpath=..").locator(".fa-kanban-count .fa-visually-hidden")).toHaveText("3 cards");
  const result = await new AxeBuilder({ page }).include("[role='region'][aria-label='Service desk']").analyze();
  expect(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([]);
});

test("the Move menu moves a card with a click: columns, a full column refused, then up and down", async ({ page }) => {
  const board = await open(page);
  const card = lane(board, "New").getByRole("group", { name: "Printer offline on level 3" });
  await card.hover();
  const trigger = board.getByRole("button", { name: "Move Printer offline on level 3" });
  await expect(trigger).toBeVisible();
  // The button sits in the card's corner and the content keeps clear of it.
  const [cardBox, triggerBox] = [(await card.boundingBox())!, (await trigger.boundingBox())!];
  expect(triggerBox.x + triggerBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width);
  expect(triggerBox.height).toBeGreaterThanOrEqual(24);
  await trigger.click();
  const menu = page.getByRole("menu", { name: "Move Printer offline on level 3" });
  await expect(menu.getByRole("menuitem")).toHaveText(["Move to Triage", "Move to In progress", "Move to Waiting on requester", "Move to Resolved", "Move down"]);
  await expect(menu.getByRole("menuitem", { name: "Move to In progress" })).toHaveAttribute("aria-disabled", "true");
  await menu.getByRole("menuitem", { name: "Move to Triage" }).click();
  await expect.poll(() => titles(lane(board, "Triage"))).toEqual(["Shared mailbox not syncing", "Badge reader rejects visitors", "Printer offline on level 3"]);
  expect(await titles(lane(board, "New"))).toEqual(["New starter laptop for Finance", "VPN drops every few minutes"]);
  await expect(status(board)).toHaveText("Moved Printer offline on level 3 to Triage, position 3 of 3.");
  await expect(lane(board, "Triage").getByRole("group", { name: "Printer offline on level 3" })).toBeFocused();

  // Within a column: up and down.
  await board.getByRole("button", { name: "Move VPN drops every few minutes" }).click();
  await page.getByRole("menuitem", { name: "Move up" }).click();
  await expect.poll(() => titles(lane(board, "New"))).toEqual(["VPN drops every few minutes", "New starter laptop for Finance"]);
  await expect(status(board)).toHaveText("Moved VPN drops every few minutes to New, position 1 of 2.");
});

test("the Move menu works from the keyboard and returns focus to the card", async ({ page }) => {
  const board = await open(page);
  const card = lane(board, "New").getByRole("group", { name: "VPN drops every few minutes" });
  await card.focus();
  await page.keyboard.press("Tab");
  const trigger = board.getByRole("button", { name: "Move VPN drops every few minutes" });
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveCSS("opacity", "1");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu", { name: "Move VPN drops every few minutes" })).toBeVisible();
  // Closing without a choice returns to the card; Tab reaches the button again.
  await page.keyboard.press("Escape");
  await expect(card).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu", { name: "Move VPN drops every few minutes" })).toBeVisible();
  await page.keyboard.press("Home");
  await expect(page.getByRole("menuitem", { name: "Move to Triage" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => titles(lane(board, "Triage"))).toContain("VPN drops every few minutes");
  await expect(lane(board, "Triage").getByRole("group", { name: "VPN drops every few minutes" })).toBeFocused();
  await expect(status(board)).toContainText("Moved VPN drops every few minutes to Triage");
});
