import { expect, test } from "@playwright/test";

/* The list view's inset: a panel's by default, none with listFlush, so a DataTable keeps its own edges. */

test("listFlush removes the list view's inset, and the default keeps it @responsive", async ({ page }) => {
  await page.goto("/components/topology-canvas");
  const measure = (id: string) =>
    page.getByTestId(id).locator(".fa-topology-list").evaluate((list) => {
      const style = getComputedStyle(list);
      const box = list.getBoundingClientRect();
      const child = list.firstElementChild!.getBoundingClientRect();
      return { start: parseFloat(style.paddingInlineStart), end: parseFloat(style.paddingInlineEnd), top: parseFloat(style.paddingBlockStart), bottom: parseFloat(style.paddingBlockEnd), gap: child.left - box.left, width: child.width, full: box.width };
    });
  await page.getByTestId("topology-list-inset").scrollIntoViewIfNeeded();
  const inset = await measure("topology-list-inset");
  expect(inset.start).toBeGreaterThan(0);
  expect(inset.gap).toBeCloseTo(inset.start, 0);
  const flush = await measure("topology-list-flush");
  expect([flush.start, flush.end, flush.top, flush.bottom]).toEqual([0, 0, 0, 0]);
  expect(flush.gap).toBeCloseTo(0, 0);
  expect(flush.width).toBeCloseTo(flush.full, 0);
});
