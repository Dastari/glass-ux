import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * Tour: a non-modal dialog named by its step title; focus moves into it and returns to the
 * button; arrows step; a missing target is skipped; the spotlight leaves the target lit and
 * clickable; buttons do not move between steps; completion is remembered.
 */

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", palette: "graphite", motion: "reduced" })),
  );
  await page.goto("/components/tour");
  const start = page.getByRole("button", { name: "Start the tour" });
  await expect(start).toBeVisible({ timeout: 30_000 });
  return { start, errors };
}

test("keyboard: focus moves into the card, arrows step past a missing target, Esc returns focus @responsive", async ({ page }) => {
  const { start, errors } = await open(page);
  await start.focus();
  await page.keyboard.press("Enter");
  const card = page.getByRole("dialog", { name: "Work orders" });
  await expect(card).toBeVisible();
  await expect(card).not.toHaveAttribute("aria-modal", "true");
  await expect(card.getByRole("button", { name: "Next" })).toBeFocused();
  await expect(card.getByText("Step 1 of 6", { exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "Back" })).toBeHidden();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "New order" })).toBeVisible();
  // Archive's target is missing: the tour goes on to Orders.
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Orders" })).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Step 5 of 6", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("dialog", { name: "New order" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(start).toBeFocused();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("mouse: the spotlight lights the target, buttons stay put, Done completes", async ({ page }) => {
  const { start } = await open(page);
  await start.click();
  const next = page.getByRole("dialog").getByRole("button", { name: /^(Next|Done)$/ });
  await next.click();
  // The hole sits over the search field: a press there reaches it.
  const search = page.getByRole("searchbox", { name: "Search work orders" });
  await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();
  const spot = page.locator(".fa-tour-spotlight");
  await expect(spot).toHaveAttribute("aria-hidden", "true");
  const box = (await search.boundingBox())!;
  const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("input")?.getAttribute("aria-label") ?? null, [box.x + box.width / 2, box.y + box.height / 2]);
  expect(hit).toBe("Search work orders");
  // Next and Back keep their size between steps; Next becomes Done in the same box.
  const before = (await next.boundingBox())!;
  await next.click();
  await next.click();
  await next.click();
  await expect(page.getByRole("dialog", { name: "Panel settings" })).toBeVisible();
  await expect(next).toHaveAccessibleName("Done");
  const after = (await next.boundingBox())!;
  expect([after.width, after.height]).toEqual([before.width, before.height]);
  await next.click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".fa-tour-spotlight")).toHaveCount(0);
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
});

test("the card passes axe and the spotlight is hidden from assistive technology", async ({ page }) => {
  const { start } = await open(page);
  await start.click();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();
  const result = await new AxeBuilder({ page }).include("[role='dialog']").analyze();
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
  const page_ = await new AxeBuilder({ page }).include("#examples").analyze();
  expect(page_.violations.map((violation) => violation.id)).toEqual([]);
});
