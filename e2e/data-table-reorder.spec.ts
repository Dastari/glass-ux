import { expect, test, type Locator, type Page } from "@playwright/test";

async function open(page: Page, appearance: Record<string, string> = {}) {
  await page.addInitScript(
    (appearance) =>
      localStorage.setItem(
        "glass-ux.appearance.v1",
        JSON.stringify({
          mode: "light",
          palette: "graphite",
          density: "comfortable",
          motion: "full",
          ...appearance,
        }),
      ),
    appearance,
  );
  await page.goto("./components/data-table");
  const demo = page.getByRole("region", { name: "Reorderable rows", exact: true });
  const table = demo.locator(".fa-dt");
  await table.scrollIntoViewIfNeeded();
  await expect(table.locator('[data-item="row"]').first()).toBeVisible();
  return { demo, table };
}

const titles = (table: Locator) =>
  table
    .locator('[data-item="row"]')
    .evaluateAll((rows) =>
      rows
        .toSorted((a, b) => Number((a as HTMLElement).dataset.index) - Number((b as HTMLElement).dataset.index))
        .map((row) => row.querySelector('[data-col="title"]')?.textContent?.trim() ?? ""),
    );

async function useSaving(demo: Locator, name: string) {
  await demo.getByRole("group", { name: "Saving" }).getByRole("button", { name, exact: true }).click();
}

test("drags a row with the pointer: a ghost follows, the rows part, release commits", async ({ page }) => {
  const { demo, table } = await open(page);
  await useSaving(demo, "Local");
  const grip = table.getByRole("button", { name: "Reorder Rotate TLS certificates" });
  const row = table.locator('[data-row-id="q2"]');
  const box = (await grip.boundingBox())!;
  const rowHeight = (await row.boundingBox())!.height;
  const before = await table.locator('[data-row-id="q3"]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let step = 1; step <= 12; step++) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + (rowHeight * 2.2 * step) / 12);
  }
  await expect(table).toHaveAttribute("data-reordering", "pointer");
  const ghost = table.locator(".fa-dt-ghost");
  await expect(ghost).toHaveCount(1);
  await expect(ghost).toHaveAttribute("aria-hidden", "true");
  await expect(row).toHaveAttribute("data-reorder-placeholder", "");
  // The rows it passed moved up into its place.
  await expect
    .poll(async () => before!.y - (await table.locator('[data-row-id="q3"]').boundingBox())!.y)
    .toBeCloseTo(rowHeight, 0);
  // Moving the pointer never re-renders a row (R14): the drag is styles only.
  const rowRenders = () =>
    page.evaluate(
      () => (window as unknown as { faDataTableRenders?: { rows: number } }).faDataTableRenders?.rows ?? 0,
    );
  const renders = await rowRenders();
  expect(renders).toBeGreaterThan(0);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + rowHeight * 2.3);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + rowHeight * 2.1);
  expect(await rowRenders()).toBe(renders);
  await page.mouse.up();
  await expect(ghost).toHaveCount(0);
  await expect(table).not.toHaveAttribute("data-reordering");
  expect((await titles(table)).slice(0, 4)).toEqual([
    "Rebuild search index",
    "Archive March audit logs",
    "Resize thumbnail cache",
    "Rotate TLS certificates",
  ]);
  await expect(demo.getByTestId("dt-reorder-last")).toHaveText(/Rotate TLS certificates: 2 → 4/);
  // Settled rows carry no displacement.
  const translates = await table
    .locator('[data-item="row"]')
    .evaluateAll((rows) => rows.map((row) => (row as HTMLElement).style.translate).filter(Boolean));
  expect(translates).toEqual([]);
});

test("Escape cancels a pointer drag and the rows return", async ({ page }) => {
  const { table } = await open(page);
  const before = await titles(table);
  const grip = table.getByRole("button", { name: "Reorder Archive March audit logs" });
  const box = (await grip.boundingBox())!;
  await page.mouse.move(box.x + 4, box.y + 4);
  await page.mouse.down();
  await page.mouse.move(box.x + 4, box.y + 60, { steps: 6 });
  await expect(table.locator(".fa-dt-ghost")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(table.locator(".fa-dt-ghost")).toHaveCount(0);
  expect(await titles(table)).toEqual(before);
  await expect(table.locator(".fa-dt-announcer")).toHaveText(/Reorder cancelled/);
});

test("reorders with the keyboard, keeps focus on the grip and announces each step", async ({ page }) => {
  const { demo, table } = await open(page, { motion: "reduced" });
  await useSaving(demo, "Server");
  const grip = table.getByRole("button", { name: "Reorder Sync partner catalogue" });
  await grip.focus();
  await page.keyboard.press("Space");
  const announcer = table.locator(".fa-dt-announcer");
  await expect(announcer).toHaveText(/Lifted Sync partner catalogue, position 5 of 8/);
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(announcer).toHaveText("Sync partner catalogue, position 3 of 8.");
  await page.keyboard.press("Space");
  await expect(announcer).toHaveText("Dropped Sync partner catalogue at position 3 of 8.");
  await expect(grip).toBeFocused();
  // Optimistic while the mock server saves (the unit tests cover the saving state).
  expect((await titles(table))[2]).toBe("Sync partner catalogue");
  await expect(demo.getByTestId("dt-reorder-last")).toHaveText(/Sync partner catalogue: 5 → 3/);
  await expect(table.getByRole("button", { name: "Reorder Refresh map tiles" })).not.toHaveAttribute("aria-disabled");
  await page.keyboard.press("Alt+ArrowDown");
  await expect(announcer).toHaveText("Dropped Sync partner catalogue at position 4 of 8.");
  await expect(grip).toBeFocused();
});

test("a rejected save reverts the move and reports it", async ({ page }) => {
  const { demo, table } = await open(page, { motion: "reduced" });
  await useSaving(demo, "Server fails");
  const before = await titles(table);
  await table.getByRole("button", { name: "Reorder Refresh map tiles" }).focus();
  await page.keyboard.press("Alt+ArrowUp");
  expect((await titles(table))[6]).toBe("Refresh map tiles");
  await expect(page.getByText("Refresh map tiles was not moved").first()).toBeVisible();
  expect(await titles(table)).toEqual(before);
  await expect(table.locator(".fa-dt-announcer")).toHaveText(/could not be moved: The queue service did not respond\. Returned to position 8 of 8/);
});

test("sorting disables the grips with the reason, without moving the columns", async ({ page }) => {
  const { table } = await open(page, { motion: "reduced" });
  const firstCell = table.locator('[data-row-id="q2"] [data-col="title"]');
  const before = (await firstCell.boundingBox())!;
  await table.getByRole("button", { name: "Estimate", exact: true }).click();
  const grip = table.getByRole("button", { name: "Reorder Rotate TLS certificates" });
  await expect(grip).toHaveAttribute("aria-disabled", "true");
  const after = (await firstCell.boundingBox())!;
  expect(after.x).toBeCloseTo(before.x, 1);
  await grip.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Clear sorting to reorder");
  // Locked rows explain themselves too.
  await table.getByRole("button", { name: "Estimate", exact: true }).click();
  await table.getByRole("button", { name: "Estimate", exact: true }).click();
  await table.getByRole("button", { name: "Reorder Rebuild search index" }).hover();
  await expect(page.getByRole("tooltip")).toHaveText("Running jobs keep their place");
});

test("a long virtualized queue auto-scrolls while dragging past the edge", async ({ page }) => {
  const { demo, table } = await open(page, { density: "compact" });
  await useSaving(demo, "Local");
  await demo.getByRole("button", { name: "400 jobs", exact: true }).click();
  const scroller = table.locator(".fa-dt-scroll");
  const grip = table.getByRole("button", { name: /^Reorder Backfill/ }).first();
  const box = (await grip.boundingBox())!;
  const body = (await scroller.boundingBox())!;
  await page.mouse.move(box.x + 4, box.y + 4);
  await page.mouse.down();
  await page.mouse.move(box.x + 4, body.y + body.height - 4, { steps: 10 });
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(400);
  const ghost = (await table.locator(".fa-dt-ghost").boundingBox())!;
  expect(ghost.y + ghost.height).toBeLessThanOrEqual(body.y + body.height + 1);
  await page.mouse.up();
  await expect(demo.getByTestId("dt-reorder-last")).toHaveText(/Backfill \w+ shard 2: 2 → \d{2,}/);
});

test("drags a card by touch on a phone @responsive", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "touch");
  const { demo, table } = await open(page, { motion: "reduced" });
  await useSaving(demo, "Local");
  await expect(table).toHaveAttribute("data-mode", "cards");
  const grip = table.getByRole("button", { name: "Reorder Rotate TLS certificates" });
  await grip.scrollIntoViewIfNeeded();
  const box = (await grip.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(43);
  const card = table.locator('[data-row-id="q2"]');
  const height = (await card.boundingBox())!.height;
  const client = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const touch = (type: string, dy: number) =>
    client.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y: y + dy }],
    });
  await touch("touchStart", 0);
  for (let step = 1; step <= 10; step++) await touch("touchMove", (height * 1.3 * step) / 10);
  await expect(table.locator(".fa-dt-ghost")).toHaveCount(1);
  await touch("touchEnd", 0);
  await expect(table.locator(".fa-dt-ghost")).toHaveCount(0);
  await expect(demo.getByTestId("dt-reorder-last")).toHaveText(/Rotate TLS certificates: 2 → 3/);
  const cards = await table
    .locator('.fa-dt-card[data-item="row"] .fa-dt-card-title')
    .allTextContents();
  expect(cards.slice(0, 3).map((text) => text.trim())).toEqual([
    "Rebuild search index",
    "Archive March audit logs",
    "Rotate TLS certificates",
  ]);
});
