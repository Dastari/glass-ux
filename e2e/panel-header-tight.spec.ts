import { expect, test } from "@playwright/test"

/* PanelHeader density="tight" (#26): no control-height minimum, the body a small step below. */

test("a tight header is as tall as its heading and the body starts just below it @responsive", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })))
  await page.goto("/components/panel-header")
  const pair = page.getByTestId("panel-header-tight")
  await expect(pair).toBeVisible({ timeout: 30_000 })
  await pair.scrollIntoViewIfNeeded()
  const measure = (index: number) =>
    pair.locator(".fa-panel").nth(index).evaluate((panel) => {
      const header = panel.querySelector(".fa-panel-header")!
      const heading = header.querySelector("h1, h2, h3, h4, h5, h6")!.getBoundingClientRect()
      const body = panel.querySelector(".fa-panel-body")!
      const text = document.createRange()
      text.selectNodeContents(body)
      const style = getComputedStyle(header)
      return {
        headerContent: header.getBoundingClientRect().height - Number.parseFloat(style.paddingTop),
        heading: heading.height,
        gap: text.getBoundingClientRect().top - heading.bottom,
      }
    })
  const [standard, tight] = [await measure(0), await measure(1)]
  // The tight header holds its heading only; the default one keeps the control-height minimum.
  expect(Math.abs(tight.headerContent - tight.heading)).toBeLessThanOrEqual(1)
  expect(standard.headerContent).toBeGreaterThan(tight.headerContent + 4)
  // The body's text starts a small step below the heading, closer than with the default header.
  expect(tight.gap).toBeGreaterThan(2)
  expect(tight.gap).toBeLessThan(standard.gap)
})
