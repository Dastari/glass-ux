import { expect, test, type Locator, type Page } from "@playwright/test";

async function open(page: Page, appearance: Record<string, string> = {}) {
  await page.addInitScript(
    (appearance) =>
      localStorage.setItem(
        "glass-ux.appearance.v1",
        JSON.stringify({ mode: "light", palette: "graphite", density: "comfortable", motion: "full", ...appearance }),
      ),
    appearance,
  );
  await page.goto("./components/drop-zone");
  const board = page.getByRole("region", { name: "Board", exact: true });
  await expect(board.getByText("Calibrate kiln sensor")).toBeVisible();
  await board.scrollIntoViewIfNeeded();
  return board;
}

const column = (board: Locator, name: string) => board.getByRole("region", { name, exact: true }).locator("ul");
const titles = (list: Locator) => list.locator("li > span:first-child").allTextContents();

async function carry(page: Page, from: Locator, to: { x: number; y: number }, steps = 16) {
  const box = (await from.boundingBox())!;
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let step = 1; step <= steps; step++)
    await page.mouse.move(start.x + ((to.x - start.x) * step) / steps, start.y + ((to.y - start.y) * step) / steps);
  // Let the frame loop pick up the target and the items settle.
  await page.waitForTimeout(400);
}

test("carries a card to another column: the source closes up, the target opens a gap, release commits", async ({ page }) => {
  const board = await open(page);
  const backlog = column(board, "Backlog");
  const done = column(board, "Done");
  const card = backlog.locator("li", { hasText: "Calibrate kiln sensor" });
  const below = backlog.locator("li", { hasText: "Draft gallery wall labels" });
  const belowBefore = (await below.boundingBox())!;
  const target = (await done.locator("li").first().boundingBox())!;
  await carry(page, card, { x: target.x + target.width / 2, y: target.y + 4 });

  await expect(card).toHaveAttribute("data-dnd-source", "move");
  await expect(page.locator(".fa-dnd-ghost")).toHaveCount(1);
  await expect(done).toHaveAttribute("data-drop-over", "");
  await expect(done).toHaveAttribute("data-drop-state", "ready");
  await expect(backlog).toHaveAttribute("data-drop-state", "ready");
  // The card left Backlog: the card below slid up into its place.
  const belowDuring = (await below.boundingBox())!;
  expect(belowBefore.y - belowDuring.y).toBeGreaterThan(belowBefore.height * 0.8);
  // Done opened a gap above its first card.
  const firstDone = (await done.locator("li").first().boundingBox())!;
  expect(firstDone.y - target.y).toBeGreaterThan(target.height * 0.8);
  await page.screenshot({ path: "test-results/development/drag-drop-carry.png" });

  await page.mouse.up();
  await expect(page.locator(".fa-dnd-ghost")).toHaveCount(0);
  expect(await titles(done)).toEqual(["Calibrate kiln sensor", "Book courier for crates"]);
  expect(await titles(backlog)).toEqual(["Draft gallery wall labels", "Order linen canvas"]);
  await expect(done).toHaveAttribute("data-drop-state", "idle");
  // Nothing is left displaced once the drop animation ends.
  await page.waitForTimeout(400);
  const translations = await board.locator("li").evaluateAll((items) => items.map((item) => getComputedStyle(item).translate));
  expect(translations.every((value) => value === "none" || value === "0px" || value === "0px 0px")).toBe(true);
});

test("a full column refuses the card with its reason and the card flies home", async ({ page }) => {
  const board = await open(page);
  const backlog = column(board, "Backlog");
  const doing = column(board, "In progress");
  // Fill In progress (2 of 3) with one card.
  const first = (await doing.locator("li").first().boundingBox())!;
  await carry(page, backlog.locator("li").first(), { x: first.x + first.width / 2, y: first.y + 4 });
  await page.mouse.up();
  await expect(doing.locator("li")).toHaveCount(3);

  const order = await titles(backlog);
  await carry(page, backlog.locator("li").first(), { x: first.x + first.width / 2, y: first.y + 4 });
  await expect(doing).toHaveAttribute("data-drop-state", "error");
  await expect(doing).toHaveAttribute("data-drop-reason", "In progress is full");
  await expect(page.locator("html")).toHaveAttribute("data-dnd", "blocked");
  await page.screenshot({ path: "test-results/development/drag-drop-full.png" });
  await page.mouse.up();
  await expect(page.locator(".fa-dnd-ghost")).toHaveCount(0);
  await expect(board.page().locator(".fa-dnd-announcer").first()).toContainText("In progress is full");
  expect(await titles(backlog)).toEqual(order);
  await expect(doing.locator("li")).toHaveCount(3);
});

test("Escape cancels a pointer drag and the click after it does not activate the card", async ({ page }) => {
  const board = await open(page);
  const backlog = column(board, "Backlog");
  const done = column(board, "Done");
  const target = (await done.boundingBox())!;
  await carry(page, backlog.locator("li").first(), { x: target.x + target.width / 2, y: target.y + 20 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator(".fa-dnd-ghost")).toHaveCount(0);
  expect(await titles(backlog)).toEqual(["Calibrate kiln sensor", "Draft gallery wall labels", "Order linen canvas"]);
  await expect(page.locator("html")).not.toHaveAttribute("data-dnd", /.*/);
});

test("filtered zones read as disabled for other types; a reactive reason blocks the archive", async ({ page }) => {
  await open(page);
  const demo = page.getByRole("region", { name: "Filtered targets", exact: true });
  await demo.scrollIntoViewIfNeeded();
  await demo.getByRole("switch", { name: "Locked" }).click();
  const image = demo.getByRole("button", { name: "north-wall.jpg" });
  const documents = demo.locator(".fa-dnd-zone", { hasText: "Documents" });
  const images = demo.locator(".fa-dnd-zone", { hasText: "Images" });
  const archive = demo.locator(".fa-dnd-zone", { hasText: "Archive" });
  const box = (await archive.boundingBox())!;
  await carry(page, image, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await expect(documents).toHaveAttribute("data-drop-state", "disabled");
  await expect(images).toHaveAttribute("data-drop-state", "ready");
  await expect(archive).toHaveAttribute("data-drop-state", "disabled");
  await expect(archive).toHaveAttribute("data-drop-reason", "Archive is locked");
  await page.screenshot({ path: "test-results/development/drag-drop-filter.png" });
  const imagesBox = (await images.boundingBox())!;
  for (let step = 1; step <= 8; step++) await page.mouse.move(box.x + box.width / 2 + ((imagesBox.x + 40 - box.x - box.width / 2) * step) / 8, imagesBox.y + imagesBox.height / 2);
  await page.waitForTimeout(200);
  await page.mouse.up();
  await expect(images).toContainText("north-wall.jpg");
});

test("reorders a grid by keyboard", async ({ page }) => {
  await open(page);
  const demo = page.getByRole("region", { name: "Rows and grids", exact: true });
  await demo.scrollIntoViewIfNeeded();
  const swatches = demo.getByRole("group", { name: "Swatches" }).or(demo.locator('[aria-label="Swatches"]'));
  const ochre = swatches.getByRole("button", { name: "Ochre" });
  await ochre.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(250);
  await page.screenshot({ path: "test-results/development/drag-drop-grid-keyboard.png" });
  await page.keyboard.press("Space");
  await expect(swatches.locator("[data-dnd-item]").nth(5)).toHaveText("Ochre");
  await expect(ochre).toBeFocused();
});

test("on touch a long press lifts a card and a quick swipe scrolls instead @responsive", async ({ page, browserName }, info) => {
  test.skip(info.project.name !== "phone" || browserName !== "chromium", "touch input runs on the phone project");
  const board = await open(page);
  const client = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) =>
    client.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  const backlog = column(board, "Backlog");
  const card = backlog.locator("li", { hasText: "Order linen canvas" });
  await card.scrollIntoViewIfNeeded();

  // A swipe that starts on a card scrolls the page and lifts nothing.
  const box = (await card.boundingBox())!;
  const scroller = page.locator(".docs-content");
  const before = await scroller.evaluate((element) => element.scrollTop);
  await touch("touchStart", box.x + 20, box.y + 10);
  for (let step = 1; step <= 6; step++) await touch("touchMove", box.x + 20, box.y + 10 - step * 20);
  await touch("touchEnd", 0, 0);
  await expect(page.locator(".fa-dnd-ghost")).toHaveCount(0);
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).not.toBe(before);

  // Hold still, then carry it to Done.
  await card.scrollIntoViewIfNeeded();
  const from = (await card.boundingBox())!;
  const done = column(board, "Done");
  await touch("touchStart", from.x + 20, from.y + 10);
  await page.waitForTimeout(400);
  await expect(page.locator(".fa-dnd-ghost")).toHaveCount(1);
  // Hold near the bottom edge: the page scrolls until Done comes up.
  const height = page.viewportSize()!.height;
  for (let step = 1; step <= 8; step++) await touch("touchMove", from.x + 20, from.y + 10 + ((height - 12 - from.y - 10) * step) / 8);
  await expect.poll(async () => (await done.boundingBox())!.y, { timeout: 8000 }).toBeLessThan(height - 120);
  const to = (await done.boundingBox())!;
  for (let step = 1; step <= 6; step++) await touch("touchMove", from.x + 20, height - 12 + ((to.y + 16 - height + 12) * step) / 6);
  await page.waitForTimeout(300);
  await expect(done).toHaveAttribute("data-drop-over", "");
  await touch("touchEnd", 0, 0);
  await expect(page.locator(".fa-dnd-ghost")).toHaveCount(0);
  expect(await titles(done)).toContain("Order linen canvas");
  expect(await titles(backlog)).not.toContain("Order linen canvas");
});
