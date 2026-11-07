import { expect, test } from "@playwright/test";

/* SessionNav's renderSession: the host draws each row's content; the row stays the nav's. */

test("each session row draws its identity, and still selects and offers its menus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/components/session-nav");
  const nav = page.getByTestId("session-identity");
  await nav.scrollIntoViewIfNeeded();
  const rows = nav.locator(".fa-ai-session[data-custom]");
  await expect(rows).toHaveCount(4);
  const second = rows.nth(1);
  await expect(second.locator(".fa-entity[data-tier='row']")).toBeVisible();
  // The identity fits the row: nothing spills, and the row keeps its height.
  const fit = await second.evaluate((row) => {
    const button = row.querySelector(".fa-ai-session-row")!;
    return { spill: button.scrollWidth - button.clientWidth, height: button.getBoundingClientRect().height };
  });
  expect(fit.spill).toBeLessThanOrEqual(1);
  const first = await rows.nth(0).locator(".fa-ai-session-row").evaluate((row) => row.getBoundingClientRect().height);
  expect(Math.abs(fit.height - first)).toBeLessThan(1);
  await second.locator(".fa-entity").click();
  await expect(second.locator(".fa-ai-session-row")).toHaveAttribute("aria-current", "page");
  await second.locator(".fa-entity").click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Archive" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(second.locator(".fa-ai-session-menu button")).toHaveCount(1);
});
