import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Locator } from "@playwright/test"

/* The Rail's More menu against real layout: the frame's height decides what fits. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })))
  await page.goto("/components/rail")
  await expect(page.getByTestId("rail-overflow").locator(".fa-shell-rail-item").first()).toBeVisible({ timeout: 30_000 })
})

const setHeight = (frame: Locator, height: number) => frame.evaluate((element, height) => void (element.style.blockSize = `${height}px`), height)

test("items fold into More as the height shrinks, come back as it grows, and never spill", async ({ page }) => {
  const frame = page.getByTestId("rail-overflow")
  const more = frame.getByRole("navigation").getByRole("button", { name: "More", exact: true })
  const list = frame.locator(".fa-shell-rail-list")
  const links = frame.locator(".fa-shell-rail-entry:not([data-overflowed]) .fa-shell-rail-item")

  await setHeight(frame, 576)
  await expect(more).toHaveCount(0)
  await expect(links).toHaveCount(9)

  let last = 9
  for (const height of [420, 320, 220, 140]) {
    await setHeight(frame, height)
    await expect(more).toBeVisible()
    await expect.poll(async () => (await links.count()) < last).toBe(true)
    last = await links.count()
    // Nothing is cut off: the list has no overflow, and every shown item is inside it.
    expect(await list.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1)
    const box = (await list.boundingBox())!
    for (const link of await links.all()) {
      const item = (await link.boundingBox())!
      expect(item.y + item.height).toBeLessThanOrEqual(box.y + box.height + 1)
    }
  }
  // At its shortest the current section stays beside More; the foot item goes last among the rest.
  await expect(frame.getByRole("button", { name: "Projects", exact: true })).toBeVisible()
  await setHeight(frame, 280)
  await expect(frame.getByRole("button", { name: "Settings", exact: true })).toBeVisible()
  await expect(frame.getByRole("button", { name: "Search", exact: true })).toBeVisible()
  await expect(frame.getByRole("button", { name: "Inbox", exact: true })).toHaveCount(0)
  // More sits between the main items and the foot.
  await expect(frame.locator("[data-rail-more] + .fa-shell-rail-spacer")).toHaveCount(1)

  await setHeight(frame, 576)
  await expect(more).toHaveCount(0)
  await expect(links).toHaveCount(9)
})

test("a menu row navigates, the chosen item joins the rail, and focus returns to More", async ({ page }) => {
  const frame = page.getByTestId("rail-overflow")
  await setHeight(frame, 220)
  const more = frame.getByRole("navigation").getByRole("button", { name: "More", exact: true })
  await more.focus()
  await page.keyboard.press("Enter")
  const menu = page.getByRole("menu", { name: "More" })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole("menuitem", { name: "Inbox" })).toBeVisible()
  await expect(frame.getByRole("button", { name: "Inbox", exact: true })).toHaveCount(0)
  await page.screenshot({ path: test.info().outputPath("rail-more.png") })
  expect((await new AxeBuilder({ page }).include(".fa-menu-popup, [role='menu']").analyze()).violations.map((violation) => violation.id)).toEqual([])

  await menu.getByRole("menuitem", { name: "Inbox" }).click()
  await expect(menu).toHaveCount(0)
  await expect(frame.getByText("Inbox", { exact: true })).toBeVisible()
  const inbox = frame.getByRole("button", { name: "Inbox", exact: true })
  await expect(inbox).toBeVisible()
  await expect(inbox).toHaveAttribute("aria-current", "page")
  await expect(more).toBeFocused()
})

test("More shows a dot while a hidden item has a badge, and the row carries the badge", async ({ page }) => {
  const frame = page.getByTestId("rail-overflow")
  await setHeight(frame, 220)
  const more = frame.getByRole("navigation").getByRole("button", { name: "More", exact: true })
  await expect(more.locator(".fa-notify-dot")).toBeVisible()
  await more.click()
  await expect(page.getByRole("menuitem", { name: "Inbox" }).locator(".fa-count")).toBeVisible()
})

test("overflow=scroll keeps every item in a column that scrolls", async ({ page }) => {
  const frame = page.getByTestId("rail-overflow")
  await setHeight(frame, 220)
  await expect(frame.getByRole("navigation").getByRole("button", { name: "More", exact: true })).toBeVisible()
  await frame.getByRole("group", { name: "Overflow" }).getByRole("button", { name: "Scroll", exact: true }).click()
  await expect(frame.locator("[data-rail-more]")).toHaveCount(0)
  await expect(frame.locator("[data-overflowed]")).toHaveCount(0)
  const list = frame.locator(".fa-shell-rail-list")
  await expect.poll(() => list.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0)
  await frame.getByRole("group", { name: "Overflow" }).getByRole("button", { name: "More", exact: true }).click()
  await expect(frame.locator("[data-rail-more]")).toHaveCount(1)
})

test.describe("TabBar", () => {
  const setWidth = (frame: Locator, width: number) => frame.evaluate((element, width) => void (element.style.inlineSize = `${width}px`), width)
  const shown = (frame: Locator) => frame.locator(".fa-tabbar-entry:not([data-overflowed])")

  test.beforeEach(async ({ page }) => {
    await page.goto("/components/tab-bar")
    await expect(page.getByTestId("tabbar-overflow").locator(".fa-tabbar-item").first()).toBeVisible({ timeout: 30_000 })
  })

  test("folds tabs into More by the limit and by width, never spills, and never scrolls", async ({ page }) => {
    const frame = page.getByTestId("tabbar-overflow")
    await frame.scrollIntoViewIfNeeded()
    const list = frame.locator(".fa-tabbar-list")
    await setWidth(frame, 600)
    await expect(shown(frame)).toHaveCount(5)
    await setWidth(frame, 240)
    await expect.poll(() => shown(frame).count()).toBeLessThan(5)
    expect(await list.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
    expect(await list.evaluate((element) => getComputedStyle(element).overflowX)).toBe("visible")
    for (const tab of await shown(frame).all()) expect((await tab.boundingBox())!.width).toBeGreaterThanOrEqual(44)
    await setWidth(frame, 600)
    await expect(shown(frame)).toHaveCount(5)
  })

  test("a sheet row navigates, its tab joins the bar and becomes current", async ({ page }) => {
    const frame = page.getByTestId("tabbar-overflow")
    await frame.scrollIntoViewIfNeeded()
    await expect(frame.getByRole("button", { name: "Team", exact: true })).toHaveCount(0)
    await frame.getByRole("navigation").getByRole("button", { name: "More", exact: true }).click()
    const sheet = page.getByRole("dialog", { name: "More" })
    await expect(sheet.getByRole("button", { name: "Team", exact: true })).toBeVisible()
    await page.waitForTimeout(100)
    await page.screenshot({ path: test.info().outputPath("tabbar-more.png") })
    expect((await new AxeBuilder({ page }).include(".fa-tabbar-more-list").analyze()).violations.map((violation) => violation.id)).toEqual([])
    await sheet.getByRole("button", { name: "Team", exact: true }).click()
    await expect(sheet).toHaveCount(0)
    const team = frame.getByRole("button", { name: "Team", exact: true })
    await expect(team).toBeVisible()
    await expect(team).toHaveAttribute("aria-current", "page")
    await expect(shown(frame)).toHaveCount(5)
  })
})
