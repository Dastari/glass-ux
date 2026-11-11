import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

/* IconPicker (#25): a field that stores an icon's name, chosen by search and keyboard. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })))
})

/** The form specimen is on IconField's page, the panel on IconPicker's. */
async function open(page: import("@playwright/test").Page, path: "icon-field" | "icon-picker", testId: string) {
  await page.goto(`/components/${path}`)
  await expect(page.getByTestId(testId)).toBeVisible({ timeout: 30_000 })
}

test("a person finds an icon by the word they use and picks it with the keyboard @responsive", async ({ page }) => {
  await open(page, "icon-field", "icon-value")
  const form = page.getByTestId("icon-form")
  const trigger = form.getByRole("button", { name: /^Icon/ })
  await expect(trigger).toContainText("ground-power")
  await trigger.focus()
  await page.keyboard.press("Enter")
  const search = page.getByRole("searchbox", { name: "Search icons" })
  await expect(search).toBeFocused()
  await search.fill("truck")
  const list = page.getByRole("listbox", { name: "Icons" })
  await expect(list.getByRole("option", { name: "supplier" })).toBeVisible()
  await page.keyboard.press("ArrowDown")
  await expect(list.getByRole("option").first()).toBeFocused()
  const first = await list.getByRole("option").first().getAttribute("aria-label")
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("icon-value")).toHaveText(`Stored: ${first}`)
  await expect(search).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test("the picker holds its size while a search narrows it, and passes axe", async ({ page }) => {
  await open(page, "icon-field", "icon-value")
  await page.getByTestId("icon-form").getByRole("button", { name: /^Icon/ }).click()
  const picker = page.locator(".fa-icon-popup .fa-icon-picker")
  await expect(picker).toBeVisible()
  const before = await picker.boundingBox()
  await page.getByRole("searchbox", { name: "Search icons" }).fill("zzzz")
  await expect(page.getByText(/No icons match/)).toBeVisible()
  expect(await picker.boundingBox()).toEqual(before)
  await page.getByRole("searchbox", { name: "Search icons" }).fill("")
  expect((await new AxeBuilder({ page }).include(".fa-icon-popup").analyze()).violations.map((violation) => violation.id)).toEqual([])
})

test("the grid moves in reading order and wraps by its columns", async ({ page, isMobile }) => {
  test.skip(isMobile, "the panel specimen is the same on a phone")
  await open(page, "icon-picker", "icon-picker-panel")
  const panel = page.getByTestId("icon-picker-panel")
  await panel.scrollIntoViewIfNeeded()
  const list = panel.getByRole("listbox")
  const crane = list.getByRole("option", { name: "crane" })
  await expect(crane).toHaveAttribute("aria-selected", "true")
  await crane.focus()
  const columns = await list.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)
  const index = async () => Number(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.index))
  const start = await index()
  await page.keyboard.press("ArrowRight")
  expect(await index()).toBe(start + 1)
  await page.keyboard.press("ArrowDown")
  expect(await index()).toBe(start + 1 + columns)
  await page.keyboard.press("Home")
  expect(await index()).toBe(0)
})
