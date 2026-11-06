import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/* A removable chip that opens: its link fills the chip up to the ✕, and nothing nests. */

test("a removable chip keeps its link up to the ✕ and passes axe @responsive", async ({ page }) => {
  await page.goto("/components/entity-identity");
  const holder = page.getByTestId("entity-removable");
  const chip = holder.locator(".fa-entity");
  await chip.scrollIntoViewIfNeeded();
  const link = chip.getByRole("link");
  const close = chip.getByRole("button");
  const [chipBox, linkBox, closeBox] = await Promise.all([chip.boundingBox(), link.boundingBox(), close.boundingBox()]);
  // The link reaches the chip's start edge and stops at the ✕; the chip's height is unchanged.
  expect(Math.abs(linkBox!.x - chipBox!.x)).toBeLessThanOrEqual(1);
  expect(linkBox!.height).toBeCloseTo(chipBox!.height, 0);
  expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(closeBox!.x + 0.5);
  expect(closeBox!.x + closeBox!.width).toBeLessThanOrEqual(chipBox!.x + chipBox!.width + 0.5);
  expect((await new AxeBuilder({ page }).include('[data-testid="entity-removable"]').analyze()).violations).toEqual([]);
});

test("keyboard reaches the link and then the ✕, and the chip draws the ring", async ({ page }) => {
  await page.goto("/components/entity-identity");
  const chip = page.getByTestId("entity-removable").locator(".fa-entity");
  await chip.getByRole("link").focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(chip.getByRole("link")).toBeFocused();
  expect(await chip.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  await page.keyboard.press("Tab");
  await expect(chip.getByRole("button")).toBeFocused();
});

test("hovering the ✕ raises no preview, and the name does", async ({ page }) => {
  await page.goto("/components/entity-identity");
  const chip = page.getByTestId("entity-removable").locator(".fa-entity");
  await chip.scrollIntoViewIfNeeded();
  await chip.getByRole("button").hover();
  await page.waitForTimeout(700);
  await expect(page.locator(".fa-entity-preview-positioner")).toHaveCount(0);
  await chip.getByRole("link").hover();
  await expect(page.locator(".fa-entity-preview-positioner")).toBeVisible();
});
