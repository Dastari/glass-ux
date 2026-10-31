import { expect, test } from "@playwright/test";

test("searching a table announces the result count once typing has paused, and the empty state", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ mode: "light", motion: "reduced" })));
  await page.goto("./components/data-table");
  const search = page.locator(".fa-dt").first().getByRole("searchbox");
  await expect(search).toBeVisible({ timeout: 30_000 });
  // The table's polite live region follows its root element.
  const live = search.locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' fa-dt ')][1]/following-sibling::div[contains(@class, 'fa-dt-announcer')][last()]");
  // Nothing is said for the table's first load. Type once it has finished, as a person would:
  // the mock server answers in 300–700 ms, and a slow runner reaches the field before that.
  await expect(page.locator(".fa-dt").first().getByRole("row").nth(1)).toBeVisible({ timeout: 30_000 });
  await expect(live).toHaveText("");

  await search.click();
  await search.pressSequentially("zzqx", { delay: 40 });
  // Not while typing and not before the pause is over.
  await expect(live).toHaveText("");
  await expect(live).toHaveText(/^No .* match "zzqx"$/, { timeout: 5000 });

  await search.fill("");
  await search.press("Enter");
  await expect(live).toHaveText(/^Results: \d/, { timeout: 5000 });
});
