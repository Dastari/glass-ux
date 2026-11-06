import { expect, test } from "@playwright/test";

/* Rows selected on a table with pages: the bar opens and the pager stays usable. */

const selectable = (page: import("@playwright/test").Page) =>
  page.locator(".fa-dt").filter({ has: page.getByRole("button", { name: /next page/i }) }).filter({ has: page.getByRole("checkbox") }).first();

for (const width of [1440, 1024, 390]) {
  test(`the pager stays clickable with rows selected at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/components/data-table");
    const table = selectable(page);
    await table.scrollIntoViewIfNeeded();
    const next = table.getByRole("button", { name: /next page/i });
    await expect(next).toBeEnabled();
    const before = await next.boundingBox();
    await table.getByRole("checkbox").nth(1).click({ force: true });
    const bar = table.locator(".fa-dt-bulk[data-open]");
    await expect(bar).toBeVisible();
    // Nothing covers it: the element at its centre is the button or inside it.
    const hit = await next.evaluate((button) => {
      const box = button.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return Boolean(top && (top === button || button.contains(top)));
    });
    expect(hit).toBe(true);
    const [barBox, after] = await Promise.all([bar.boundingBox(), next.boundingBox()]);
    const overlapX = Math.min(barBox!.x + barBox!.width, after!.x + after!.width) - Math.max(barBox!.x, after!.x);
    const overlapY = Math.min(barBox!.y + barBox!.height, after!.y + after!.height) - Math.max(barBox!.y, after!.y);
    expect(overlapX > 0.5 && overlapY > 0.5).toBe(false);
    // At desktop width the pager does not move sideways when the bar opens.
    if (width >= 1024) expect(Math.abs(after!.x - before!.x)).toBeLessThanOrEqual(1);
    // The selection survives the page change, and the bar stays open.
    await next.click();
    await expect(bar).toBeVisible();
  });
}
