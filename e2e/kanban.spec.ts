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
  const card = lane(board, "New").getByRole("button", { name: "Printer offline on level 3" });
  const first = (await triage.locator("li").first().boundingBox())!;
  await carry(page, card, { x: first.x + first.width / 2, y: first.y + 4 });
  await expect(triage).toHaveAttribute("data-drop-over", "");
  await page.mouse.up();
  await expect.poll(() => titles(triage)).toEqual(["Printer offline on level 3", "Shared mailbox not syncing", "Badge reader rejects visitors"]);
  expect(await titles(lane(board, "New"))).toEqual(["New starter laptop for Finance", "VPN drops every few minutes"]);
  await expect(board.getByRole("heading", { name: "Triage" }).locator("xpath=..").locator(".fa-kanban-count")).toHaveText("3");
});

test("a full column refuses a card with its reason and the card goes home", async ({ page }) => {
  const board = await open(page);
  const progress = lane(board, "In progress");
  await expect(board.locator(".fa-kanban-count[data-full]")).toHaveText("3 / 3");
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
  const card = lane(board, "New").getByRole("button", { name: "VPN drops every few minutes" });
  await card.focus();
  await page.keyboard.press("Space");
  await expect(announcer(board)).toContainText("Lifted VPN drops every few minutes");
  await page.keyboard.press("ArrowRight");
  await expect(announcer(board)).toContainText("Triage");
  await page.keyboard.press("Space");
  await expect(announcer(board)).toContainText("Dropped VPN drops every few minutes in Triage");
  await expect.poll(() => titles(lane(board, "Triage"))).toContain("VPN drops every few minutes");
  await expect(lane(board, "Triage").getByRole("button", { name: "VPN drops every few minutes" })).toBeFocused();
});

test("a rejected save flies the card back and says why", async ({ page }) => {
  const board = await open(page, "Saving board");
  const card = lane(board, "New").getByRole("button", { name: "Printer offline on level 3" });
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
  await expect(strip.locator(".fa-kanban-count")).toHaveText("2");
  const box = (await strip.boundingBox())!;
  await carry(page, lane(board, "New").locator("li").first(), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await page.mouse.up();
  await expect(strip.locator(".fa-kanban-count")).toHaveText("3");
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
  const width = (await scroller.boundingBox())!.width;
  const column = (await board.locator("[data-kanban-column='new']").boundingBox())!;
  expect(Math.abs(column.width - width)).toBeLessThan(2);
  await board.getByRole("button", { name: "Next column" }).click();
  await expect.poll(async () => (await board.locator("[data-kanban-column='triage']").boundingBox())!.x).toBeLessThan(column.x + 2);
  await expect(board.locator(".fa-kanban-switch")).toContainText("Triage");
  await page.screenshot({ path: `test-results/development/kanban-narrow-${info.project.name}.png` });
});
