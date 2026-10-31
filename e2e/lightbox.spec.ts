import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced" })));
  await page.goto("./components/lightbox");
});

test("a zoomed stage scrolls with the arrow keys; fitted, they change picture, and the change is announced @responsive", async ({ page }) => {
  await page.getByRole("button", { name: /^Open Sample landscape/ }).first().click();
  const dialog = page.getByRole("dialog");
  const stage = dialog.locator(".fa-lightbox-stage");
  await expect(stage).toBeVisible();
  const first = await stage.getAttribute("aria-label");
  const live = dialog.locator('[aria-live="polite"][aria-atomic="true"]');
  await expect(live).toHaveText("");

  // Zoomed: ← → belong to the focused stage, which scrolls.
  await page.keyboard.press("+");
  await expect(dialog.locator(".fa-lightbox-zoom")).toHaveText("150%");
  await stage.focus();
  const before = await stage.evaluate((element) => element.scrollLeft);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => stage.evaluate((element) => element.scrollLeft)).toBeGreaterThan(before);
  await expect(stage).toHaveAttribute("aria-label", first!);
  await expect(live).toHaveText("");
  // The buttons still change picture while zoomed.
  await dialog.getByRole("button", { name: "Next image" }).click();
  await expect(stage).not.toHaveAttribute("aria-label", first!);
  await expect(live).toHaveText(/^Image 2 of \d+: Sample landscape/);

  // Fitted: the arrow keys change picture again, from the stage too.
  await page.keyboard.press("0");
  await expect(dialog.locator(".fa-lightbox-zoom")).toHaveText("Fit");
  await stage.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(stage).toHaveAttribute("aria-label", first!);
  await expect(live).toHaveText(/^Image 1 of \d+: Sample landscape/);
});
