import { expect, test } from "@playwright/test"

/* DataTable cardRole "media" (#22): across a card's top edge to edge, and a thumbnail in the table. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })))
  await page.goto("/components/data-table")
  await expect(page.getByTestId("dt-attachments").locator(".fa-dt-card").first()).toBeVisible({ timeout: 30_000 })
})

test("a card draws its media column across its top, edge to edge, in the column's ratio @responsive", async ({ page }) => {
  const demo = page.getByTestId("dt-attachments")
  await demo.scrollIntoViewIfNeeded()
  for (const card of (await demo.locator(".fa-dt-card").all()).slice(0, 3)) {
    const geometry = await card.evaluate((element) => {
      const box = element.getBoundingClientRect()
      const media = element.querySelector(".fa-dt-card-media")!.getBoundingClientRect()
      const head = element.querySelector(".fa-dt-card-head")!.getBoundingClientRect()
      const border = Number.parseFloat(getComputedStyle(element).borderTopWidth)
      return { box: { left: box.left, right: box.right, top: box.top }, media: { left: media.left, right: media.right, top: media.top, bottom: media.bottom, width: media.width, height: media.height }, head: head.top, border }
    })
    expect(Math.abs(geometry.media.left - geometry.box.left - geometry.border)).toBeLessThanOrEqual(1)
    expect(Math.abs(geometry.box.right - geometry.media.right - geometry.border)).toBeLessThanOrEqual(1)
    expect(Math.abs(geometry.media.top - geometry.box.top - geometry.border)).toBeLessThanOrEqual(1)
    expect(Math.abs(geometry.media.width / geometry.media.height - 4 / 3)).toBeLessThan(0.02)
    expect(geometry.head).toBeGreaterThanOrEqual(geometry.media.bottom)
  }
  // An image covers its box.
  const image = demo.locator(".fa-dt-card-media img").first()
  const [frame, picture] = await Promise.all([demo.locator(".fa-dt-card-media").first().boundingBox(), image.boundingBox()])
  expect(Math.abs(frame!.width - picture!.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(frame!.height - picture!.height)).toBeLessThanOrEqual(1)
})

test("the table draws the media column as a thumbnail inside the row", async ({ page, isMobile }) => {
  test.skip(isMobile, "the table view needs the width")
  const demo = page.getByTestId("dt-attachments")
  await demo.scrollIntoViewIfNeeded()
  await demo.getByRole("button", { name: "List", exact: true }).click()
  const row = demo.locator(".fa-dt-rows > .fa-dt-row").first()
  await expect(row).toBeVisible()
  const [rowBox, thumb] = await Promise.all([row.boundingBox(), row.locator('[data-media] img').boundingBox()])
  expect(thumb!.height).toBeGreaterThan(16)
  expect(thumb!.y).toBeGreaterThanOrEqual(rowBox!.y)
  expect(thumb!.y + thumb!.height).toBeLessThanOrEqual(rowBox!.y + rowBox!.height)
  expect(Math.abs(thumb!.width / thumb!.height - 4 / 3)).toBeLessThan(0.05)
})
