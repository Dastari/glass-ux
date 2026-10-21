import { expect, test, type Locator, type Page } from "@playwright/test";

async function open(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem(
      "glass-ux.appearance.v1",
      JSON.stringify({ mode: "light", palette: "graphite", density: "comfortable", motion: "full" }),
    ),
  );
  await page.goto("./components/data-table");
  const demo = page.getByRole("region", { name: "Infinite loading", exact: true });
  const table = demo.locator(".fa-dt");
  await table.scrollIntoViewIfNeeded();
  await expect(table.locator('[data-item="row"]').first()).toBeVisible();
  return { demo, table, count: table.locator(".fa-dt-count"), scroller: table.locator(".fa-dt-scroll") };
}

const toEnd = (scroller: Locator) => scroller.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
const loaded = async (count: Locator) => Number((await count.textContent())?.match(/^([\d,]+)/)?.[1]?.replace(/,/g, ""));

test("loads the next batch as the end comes near, with a count in place of the pager", async ({ page }) => {
  const { table, count, scroller } = await open(page);
  await expect(count).toHaveText(/^50 of [\d,]+ endpoints$/);
  await expect(table.locator(".fa-dt-pager")).toHaveCount(0);
  await expect(table.getByRole("checkbox", { name: "Select all loaded rows" })).toBeVisible();

  // The end line is a placeholder in the row box, one row tall, after the 50th row.
  const end = table.locator(".fa-dt-load-row");
  await expect(end).toHaveAttribute("aria-hidden", "true");
  const rowHeight = await table.locator('[data-item="row"]').first().evaluate((row) => row.getBoundingClientRect().height);
  expect(await end.evaluate((row) => row.getBoundingClientRect().height)).toBeCloseTo(rowHeight, 0);

  // The rows already shown stay where they are while the batch arrives below them.
  await toEnd(scroller);
  const anchor = table.locator('[data-item="row"][data-index="45"]');
  await expect(anchor).toBeVisible();
  const before = await anchor.boundingBox();
  await expect(count).toHaveText(/^100 of /);
  expect((await anchor.boundingBox())?.y).toBeCloseTo(before!.y, 0);
  // The next batch is asked for a screen before the end, not at it.
  await scroller.evaluate((element) => element.scrollTo({ top: element.scrollHeight - element.clientHeight * 1.5 }));
  await expect(count).toHaveText(/^150 of /);
  await expect(table.getByRole("grid")).toHaveAttribute("aria-rowcount", /^\d+$/);
});

test("End from the keyboard reaches the loaded end and loads more", async ({ page }) => {
  const { table, count } = await open(page);
  await table.locator('[data-item="row"]').first().click({ position: { x: 4, y: 4 } });
  await page.keyboard.press("End");
  await expect(count).toHaveText(/^100 of /);
  await page.keyboard.press("End");
  await expect(count).toHaveText(/^150 of /);
  await expect(table.locator('[data-item="row"]:focus')).toHaveAttribute("data-index", /^(99|149)$/);
});

test("sorting starts a new list from the top", async ({ page }) => {
  const { table, count, scroller } = await open(page);
  await toEnd(scroller);
  await expect(count).toHaveText(/^100 of /);
  await table.getByRole("columnheader", { name: /Organisation/ }).locator(".fa-dt-th-button").click();
  await expect(count).toHaveText(/^50 of /);
  expect(await scroller.evaluate((element) => element.scrollTop)).toBe(0);
});

test("a failed batch keeps the rows and offers Retry at the end", async ({ page }) => {
  const { demo, table, count, scroller } = await open(page);
  await demo.getByRole("button", { name: "Fail next batch" }).click();
  await toEnd(scroller);
  const end = table.locator(".fa-dt-load-row");
  await expect(end).toHaveAttribute("data-state", "error");
  await expect(end).toContainText("Couldn't load more endpoints");
  expect(await loaded(count)).toBe(50);
  // The failure reads from the start of the visible width, one row tall.
  const cell = await end.locator(".fa-dt-load-cell").boundingBox();
  const frame = await scroller.boundingBox();
  expect(cell!.x).toBeGreaterThanOrEqual(frame!.x);
  await end.getByRole("button", { name: "Retry" }).click();
  await expect(count).toHaveText(/^100 of /);
  await expect(end).not.toHaveAttribute("data-state", "error");
});

test("cards load more too", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  const { table, count, scroller } = await open(page);
  await expect(table).toHaveAttribute("data-mode", "cards");
  await expect(table.locator(".fa-dt-load-card")).toHaveCount(1);
  await toEnd(scroller);
  await expect(count).toHaveText(/^100 of /);
});
