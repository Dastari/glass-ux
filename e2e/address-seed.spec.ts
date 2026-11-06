import { expect, test } from "@playwright/test";

/** AddressInput's defaultQuery: the lookup starts from existing text and asks only once the person comes to it. */
test("a click on the seeded text shows its suggestions and a pick fills the parts @responsive", async ({ page }) => {
  await page.goto("/components/address-input");
  const seeded = page.getByTestId("address-seeded");
  await seeded.scrollIntoViewIfNeeded();
  // The lookup comes first; the parts that a pick reveals include comboboxes of their own.
  const lookup = seeded.getByRole("combobox").first();
  await expect(lookup).toHaveValue("12 Example Lane Hobart");
  // Nothing has asked, so nothing is open.
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await lookup.click();
  const option = page.getByRole("option").first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(seeded.getByRole("textbox", { name: "Street address" })).not.toHaveValue("");
  await expect(lookup).toHaveValue("");
});

test("the arrow key opens the suggestions from the keyboard", async ({ page }) => {
  await page.goto("/components/address-input");
  const seeded = page.getByTestId("address-seeded");
  await seeded.scrollIntoViewIfNeeded();
  await seeded.getByRole("combobox").first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option").first()).toBeVisible();
});
