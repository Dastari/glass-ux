import { expect, test, type Page } from "@playwright/test";

/* Enter manually hands focus to the first field as the fields open, and nothing takes it back later. */

/** Hold every animation frame, as a busy page does, so anything waiting on one lands late. */
const lateFrames = (page: Page) =>
  page.evaluate(() => {
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(performance.now()), 250);
  });

async function openDemo(page: Page) {
  await page.goto("/components/address-input");
  const field = page.getByTestId("address-rate-limited");
  await field.scrollIntoViewIfNeeded();
  return field;
}

test("focus is in Street address as soon as the fields open", async ({ page }) => {
  const field = await openDemo(page);
  await lateFrames(page);
  await field.getByRole("button", { name: "Enter manually" }).click();
  await expect(field.getByLabel("Street address")).toBeFocused({ timeout: 100 });
});

test("text typed straight after stays in the field it was typed in @responsive", async ({ page }) => {
  const field = await openDemo(page);
  await lateFrames(page);
  await field.getByRole("button", { name: "Enter manually" }).click();
  const street = field.getByLabel("Street address");
  const suburb = field.getByLabel("Suburb");
  await street.fill("6 Integrity Drive");
  await suburb.fill("Westbury");
  await page.waitForTimeout(400);
  await expect(suburb).toBeFocused();
  await expect(street).toHaveValue("6 Integrity Drive");
  await expect(suburb).toHaveValue("Westbury");
});

test("from the keyboard, Enter on the button lands in Street address", async ({ page }) => {
  const field = await openDemo(page);
  await field.getByRole("button", { name: "Enter manually" }).focus();
  await page.keyboard.press("Enter");
  await expect(field.getByLabel("Street address")).toBeFocused();
  await page.keyboard.type("6 Integrity Drive");
  await expect(field.getByLabel("Street address")).toHaveValue("6 Integrity Drive");
});

test("with the suggestion list open, the fields still take focus", async ({ page }) => {
  const field = await openDemo(page);
  await field.getByRole("combobox").first().click();
  await expect(page.getByRole("alert").filter({ hasText: "Too many lookups" })).toBeVisible();
  // An open list hides the page from role queries, so this finds the button by its class.
  await field.locator(".fa-address-manual").click();
  const street = field.getByLabel("Street address");
  await expect(street).toBeFocused();
  await page.waitForTimeout(400);
  await expect(street).toBeFocused();
});
