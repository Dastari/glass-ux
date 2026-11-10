import { expect, test, type Page } from "@playwright/test"

/* MoneyInput: a currency picker inside the box, and amounts finer than a cent (#27). */

async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })))
  await page.goto("/components/money-field")
  await expect(page.getByTestId("money-currency-state")).toBeVisible({ timeout: 30_000 })
}

test("the currency picker sits inside the box and changing it keeps the amount @responsive", async ({ page }) => {
  await open(page)
  const trigger = page.getByRole("combobox", { name: /^Currency: Australian Dollar \(AUD\)$/ })
  const amount = page.getByRole("textbox", { name: "Invoice total" })
  await expect(amount).toHaveValue("1,299.00")
  // Inside the box, before the amount, and no taller than it.
  const [box, picker, input] = await Promise.all([
    amount.evaluate((element) => element.closest(".fa-number-group")!.getBoundingClientRect().toJSON()),
    trigger.boundingBox(),
    amount.boundingBox(),
  ])
  expect(picker!.x).toBeGreaterThanOrEqual(box.x)
  expect(picker!.y).toBeGreaterThanOrEqual(box.y)
  expect(picker!.y + picker!.height).toBeLessThanOrEqual(box.y + box.height)
  expect(picker!.x + picker!.width).toBeLessThanOrEqual(input!.x + 1)
  // The amount does not move when the list opens.
  await trigger.click()
  const list = page.getByRole("listbox")
  await expect(list).toBeVisible()
  expect((await amount.boundingBox())!.x).toBe(input!.x)
  await list.getByRole("option", { name: /Japanese Yen/ }).click()
  await expect(page.getByTestId("money-currency-state")).toHaveText(/^Stored: 1299 in JPY/)
  await expect(amount).toHaveValue("1,299")
  await expect(page.getByRole("combobox", { name: /\(JPY\)$/ })).toContainText("¥")
  // The keyboard reaches the picker before the amount.
  await page.getByRole("combobox", { name: /\(JPY\)$/ }).focus()
  await page.keyboard.press("Tab")
  await expect(amount).toBeFocused()
})

test("a unit cost keeps four decimals and shows at least two (#27)", async ({ page }) => {
  await open(page)
  const input = page.getByTestId("money-unit-cost")
  await input.scrollIntoViewIfNeeded()
  await expect(input).toHaveValue("$0.0525")
  await input.fill("1.2")
  await input.blur()
  await expect(input).toHaveValue("$1.20")
  await input.fill("0.12345")
  await input.blur()
  await expect(input).toHaveValue("$0.1235")
})
