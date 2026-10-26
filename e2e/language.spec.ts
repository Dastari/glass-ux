import { expect, test } from "@playwright/test"

test("language packs switch built-in controls without resetting their state @responsive", async ({ page }) => {
  await page.goto("/foundations/locale")
  const specimen = page.locator("[data-language-specimen]")
  const controls = specimen.locator("[data-language-controls]")
  await controls.getByRole("button", { name: "Next page", exact: true }).click()
  const jump = controls.locator(".fa-pager-jump input")
  // The responsive pager can hide the jump field, but it retains its current page.
  await expect(jump).toHaveValue("2")
  const next = await controls.getByRole("button", { name: "Next page", exact: true }).elementHandle()

  await specimen.getByRole("combobox", { name: "Language", exact: true }).click()
  await page.getByRole("option", { name: "Deutsch", exact: true }).click()
  await expect(controls.getByRole("button", { name: "Nächste Seite", exact: true })).toBeVisible()
  expect(await next?.evaluate((element) => element.getAttribute("aria-label"))).toBe("Nächste Seite")
  await expect(jump).toHaveValue("2")
  await expect(controls.getByRole("textbox", { name: "Language sample date" })).toHaveValue("03.10.2026")
  await expect(controls.getByRole("combobox", { name: "Language sample choice" })).toContainText("Auswählen…")
  await expect(controls.getByRole("status").filter({ hasText: "Keine Daten" })).toBeVisible()

  await controls.getByRole("button", { name: "Datum auswählen", exact: true }).click()
  await expect(page.getByRole("button", { name: "Vorheriger Monat", exact: true })).toBeVisible()
  await page.keyboard.press("Escape")

  await controls.getByRole("button", { name: "Änderungen verwerfen", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("button", { name: "Schließen", exact: true })).toBeVisible()
  await dialog.getByRole("button", { name: "Schließen", exact: true }).click()
  await expect(controls.getByRole("button", { name: "Änderungen verwerfen", exact: true })).toBeFocused()

  await controls.getByRole("button", { name: "Änderungen speichern", exact: true }).click()
  await expect(page.getByText("Gespeichert", { exact: true })).toBeVisible()
  // Base UI exposes toast controls to assistive technology when the stack has focus.
  await page.keyboard.press("F6")
  await page.getByRole("button", { name: "Schließen", exact: true }).click()

  await specimen.getByRole("combobox", { name: "Language", exact: true }).click()
  await page.getByRole("option", { name: "日本語", exact: true }).click()
  await expect(controls.getByRole("button", { name: "次のページ", exact: true })).toBeVisible()
  await expect(jump).toHaveAttribute("aria-label", "ページ（全5ページ）")
  await expect(jump).toHaveValue("2")

  await specimen.getByRole("combobox", { name: "Language", exact: true }).click()
  await page.getByRole("option", { name: "עברית", exact: true }).click()
  await expect(specimen.locator('[lang="he"]')).toHaveAttribute("dir", "rtl")
  await expect(controls.getByRole("button", { name: "העמוד הבא", exact: true })).toBeVisible()
  await expect(jump).toHaveValue("2")

  await specimen.getByRole("combobox", { name: "Language", exact: true }).click()
  await page.getByRole("option", { name: "العربية", exact: true }).click()
  await expect(specimen.locator('[lang="ar"]')).toHaveAttribute("dir", "rtl")
  await expect(controls.getByRole("button", { name: "Next page", exact: true })).toHaveCount(0)
  await expect(jump).toHaveValue("2")
  // Small buttons deliberately extend their touch targets beyond their visible boxes.
  const bounds = await controls.evaluate((element) => {
    const region = element.getBoundingClientRect()
    return [...element.querySelectorAll("*")].map((child) => child.getBoundingClientRect())
      .filter((rect) => rect.width > 1 && rect.height > 0)
      .every((rect) => rect.left >= region.left - 1 && rect.right <= region.right + 1)
  })
  expect(bounds).toBe(true)

  await specimen.getByRole("combobox", { name: "Language", exact: true }).click()
  await page.getByRole("option", { name: "English", exact: true }).click()
  await expect(controls.getByRole("button", { name: "Next page", exact: true })).toBeVisible()
  await expect(jump).toHaveValue("2")
})
