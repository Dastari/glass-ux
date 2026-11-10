import { expect, test } from "@playwright/test"

/* Metric with href (#29): the whole box is a link named by its label and value. */

test("a linked metric is one target with a hover fill and the focus ring @responsive", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })))
  await page.goto("/components/metric")
  const links = page.getByTestId("metric-links")
  await expect(links).toBeVisible({ timeout: 30_000 })
  await links.scrollIntoViewIfNeeded()
  const link = links.getByRole("link", { name: "Overdue: 3" })
  await expect(link).toHaveAttribute("href", "#overdue")
  // The label shows: the tile is tall enough for the compact tier.
  await expect(link.locator(".fa-metric-label")).toBeVisible()
  const tile = await link.evaluate((element) => [element.getBoundingClientRect().toJSON(), element.parentElement!.getBoundingClientRect().toJSON()])
  expect(tile[0].width).toBeGreaterThan(tile[1].width - 10)
  const fill = () => link.evaluate((element) => getComputedStyle(element).backgroundColor)
  const rest = await fill()
  await link.hover()
  await expect.poll(fill).not.toBe(rest)
  await page.mouse.move(0, 0)
  await link.focus()
  await page.keyboard.press("Shift+Tab")
  await page.keyboard.press("Tab")
  await expect(link).toBeFocused()
  expect(await link.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid")
})
