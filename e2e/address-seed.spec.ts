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

test("a failed lookup says what to do next, keeps Retry and wraps @responsive", async ({ page }) => {
  await page.goto("/components/address-input");
  const field = page.getByTestId("address-unavailable");
  await field.scrollIntoViewIfNeeded();
  const lookup = field.getByRole("combobox").first();
  await lookup.click();
  await page.keyboard.press("ArrowDown");
  const note = page.getByRole("alert").filter({ hasText: "Address lookup is unavailable right now" });
  await expect(note).toBeVisible();
  await expect(note.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(page.getByText("Search failed — check the connection and retry.")).toHaveCount(0);
  // The whole sentence shows: it wraps rather than ending in an ellipsis.
  const text = note.locator(".fa-option-note-text");
  expect(await text.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  await expect(text).toContainText("under Enter manually");
  // With the list shut, the message and the way forward are both still there.
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  await expect(field.locator(".fa-address-lookup-failure")).toBeVisible();
  await expect(field.getByRole("button", { name: "Enter manually" })).toBeVisible();
});

test("too many lookups reads as a rate limit", async ({ page }) => {
  await page.goto("/components/address-input");
  const field = page.getByTestId("address-rate-limited");
  await field.scrollIntoViewIfNeeded();
  await field.getByRole("combobox").first().click();
  await expect(page.getByRole("alert").filter({ hasText: "Too many lookups. Try again in a moment." })).toBeVisible();
});
