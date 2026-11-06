import { expect, test, type Locator } from "@playwright/test";

/* A menu with any icon keeps that column on every row, so labels share one edge. */

const labelEdges = (surface: Locator) =>
  surface.locator(".fa-item-label").evaluateAll((labels) => labels.map((label) => Math.round(label.getBoundingClientRect().left)));

test("rows with and without icons start their labels at one edge", async ({ page }) => {
  await page.goto("/components/menu");
  const mixed = page.getByTestId("menu-mixed-rows");
  await mixed.scrollIntoViewIfNeeded();
  const edges = await labelEdges(mixed);
  expect(edges).toHaveLength(4);
  expect(new Set(edges).size).toBe(1);
});

test("a menu with no icons keeps its labels at the row's inset", async ({ page }) => {
  await page.goto("/components/menu");
  const plain = page.getByTestId("menu-plain-rows");
  await plain.scrollIntoViewIfNeeded();
  const padding = await plain.locator(".fa-menu-item").first().evaluate((row) => {
    const style = getComputedStyle(row);
    return { start: style.paddingInlineStart, end: style.paddingInlineEnd };
  });
  expect(padding.start).toBe(padding.end);
});
