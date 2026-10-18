import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * A wheel over a table scrolls whatever can scroll: the rows of a fill table that overflows,
 * otherwise the page or pane around the table. The table's scroller contains the wheel only
 * while its rows overflow (Chromium ends the scroll chain at any scroll container with
 * overscroll-behavior: contain, even one with nothing to scroll), and a wheel over the
 * header row scrolls the rows beneath it.
 */

const scrollTop = (locator: Locator) =>
  locator.evaluate((element) => element.scrollTop);

async function wheelOver(page: Page, target: Locator, deltaY = 300) {
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, deltaY);
}

async function openPage(page: Page) {
  await page.goto("/components/data-table");
  const column = page.locator(".docs-content");
  await expect(column).toBeVisible({ timeout: 30_000 });
  return column;
}

test("a wheel over an auto-height table scrolls the page around it @responsive", async ({
  page,
}, info) => {
  const column = await openPage(page);
  const table = page
    .getByRole("region", { name: "Default columns", exact: true })
    .locator(".fa-dt");
  await expect(table).toHaveAttribute(
    "data-mode",
    info.project.name === "phone" ? "cards" : "table",
  );
  const row = table.locator('[data-row-id="s1"]');
  await row.scrollIntoViewIfNeeded();
  await expect(table.locator(".fa-dt-scroll")).toHaveCSS(
    "overscroll-behavior-y",
    "auto",
  );

  const before = await scrollTop(column);
  await wheelOver(page, row);
  await expect.poll(() => scrollTop(column)).toBeGreaterThan(before + 100);
});

test("a wheel over a fill table whose rows fit scrolls the page around it @responsive", async ({
  page,
}) => {
  const column = await openPage(page);
  const table = page.locator(".fa-dt[data-height='fill']").first();
  const scroller = table.locator(".fa-dt-scroll");
  // Rows in the table layout, cards below the card breakpoint.
  const lines = table.locator(".fa-dt-rows > .fa-dt-row, .fa-dt-cards > .fa-dt-card");
  await expect(lines.nth(3)).toBeVisible();
  // A pane taller than every line: nothing for the table to scroll.
  await table.evaluate((element) => {
    const content = element.querySelector(".fa-dt-scroll")!.firstElementChild!;
    element.style.height = `${content.scrollHeight + 400}px`;
  });
  await expect(table).not.toHaveAttribute("data-scrolled-bottom");
  await expect(scroller).toHaveCSS("overscroll-behavior-y", "auto");

  const row = lines.nth(1);
  await row.scrollIntoViewIfNeeded();
  const before = await scrollTop(column);
  await wheelOver(page, row);
  await expect.poll(() => scrollTop(column)).toBeGreaterThan(before + 100);
  expect(await scrollTop(scroller)).toBe(0);
});

test("a wheel over a fill table's rows and header scrolls its rows, also once a row is focused", async ({
  page,
}) => {
  const column = await openPage(page);
  const table = page.locator(".fa-dt[data-height='fill']").first();
  const scroller = table.locator(".fa-dt-scroll");
  const rows = table.locator(".fa-dt-rows > .fa-dt-row");
  await expect(rows.nth(3)).toBeVisible();
  await scroller.scrollIntoViewIfNeeded();
  await expect(table).toHaveAttribute("data-scrolled-bottom", "");
  // Overflowing rows keep the wheel: they do not hand it on to the page.
  await expect(scroller).toHaveCSS("overscroll-behavior-y", "contain");
  const page0 = await scrollTop(column);

  await wheelOver(page, rows.nth(2), 200);
  await expect.poll(() => scrollTop(scroller)).toBe(200);

  // Focus a row, then wheel again over the rows.
  const row = table.locator(".fa-dt-rows > .fa-dt-row").nth(6);
  const box = (await row.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height / 2);
  await expect(row).toBeFocused();
  await page.mouse.wheel(0, 200);
  await expect.poll(() => scrollTop(scroller)).toBe(400);

  // The header sits outside the scroller; a wheel over it still scrolls the rows.
  await wheelOver(page, table.locator(".fa-dt-head"), -300);
  await expect.poll(() => scrollTop(scroller)).toBe(100);
  expect(await scrollTop(column)).toBe(page0);
});
