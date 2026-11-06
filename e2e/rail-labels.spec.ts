import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Locator, type Page } from "@playwright/test"

/* Rail labels against real layout: the frame's height decides what fits, whatever the appearance. */

const SHELL_STORAGE_KEY = "workspace.shell.v1"

const open = async (page: Page, appearance: Record<string, unknown> = {}, query = "") => {
  await page.addInitScript((stored) => localStorage.setItem("glass-ux.appearance.v1", stored), JSON.stringify({ motion: "reduced", mode: "light", ...appearance }))
  await page.goto(`/components/rail${query}`)
  await expect(page.getByTestId("rail-labels").locator(".fa-shell-rail-item").first()).toBeVisible({ timeout: 30_000 })
  await page.evaluate(() => document.fonts.ready)
  return page.getByTestId("rail-labels")
}

const setHeight = (frame: Locator, height: number) => frame.evaluate((element, height) => void (element.style.blockSize = `${height}px`), height)

/** What the fit relies on: nothing spills, no item is clipped sideways, and every entry is as tall hidden as shown. */
async function expectFits(frame: Locator) {
  const facts = await frame.locator(".fa-shell-rail-list").evaluate((list) => {
    const style = getComputedStyle(list)
    const box = list.getBoundingClientRect()
    const entries = [...list.querySelectorAll<HTMLElement>(".fa-shell-rail-entry")]
    return {
      spill: list.scrollHeight - list.clientHeight,
      sideways: list.scrollWidth - list.clientWidth,
      heights: entries.map((entry) => entry.getBoundingClientRect().height),
      outside: entries
        .filter((entry) => !entry.hasAttribute("data-overflowed"))
        .filter((entry) => {
          const rect = entry.getBoundingClientRect()
          return rect.bottom > box.bottom + 0.5 || rect.top < box.top - 0.5 || rect.left < box.left - 0.5 || rect.right > box.right + 0.5
        }).length,
      insetStart: Number.parseFloat(style.paddingInlineStart),
      insetEnd: Number.parseFloat(style.paddingInlineEnd),
    }
  })
  expect(facts.spill).toBeLessThanOrEqual(1)
  expect(facts.sideways).toBeLessThanOrEqual(0)
  expect(facts.outside).toBe(0)
  // Room for the focus ring between the full-width items and the list's clipping edge.
  expect(facts.insetStart).toBeGreaterThanOrEqual(4)
  expect(facts.insetEnd).toBeGreaterThanOrEqual(4)
  expect(Math.max(...facts.heights) - Math.min(...facts.heights)).toBeLessThanOrEqual(0.5)
}

const APPEARANCES: Array<[string, Record<string, unknown>]> = [
  ["default", {}],
  ["compact density", { density: "compact" }],
  ["UI scale 0.875", { uiScale: 0.875 }],
  ["UI scale 1.25", { uiScale: 1.25 }],
  ["square corners", { radiusScale: 0 }],
  ["line weight 2", { borderWidth: 2 }],
]

for (const [name, appearance] of APPEARANCES) {
  test(`fits at every height under ${name}`, async ({ page }) => {
    const frame = await open(page, appearance)
    const more = frame.getByRole("navigation").getByRole("button", { name: "More", exact: true })
    const shown = frame.locator(".fa-shell-rail-entry:not([data-overflowed]) .fa-shell-rail-item")

    await setHeight(frame, 900)
    await expect(more).toHaveCount(0)
    await expect(shown).toHaveCount(9)
    await expectFits(frame)

    let last = 9
    for (const height of [420, 320, 240, 180]) {
      await setHeight(frame, height)
      await expect(more).toBeVisible()
      // Each step loses a row, down to the floor: the current section beside More.
      await expect.poll(() => shown.count()).toBeLessThanOrEqual(Math.max(last - 1, 2))
      last = await shown.count()
      await expectFits(frame)
    }
    await expect(frame.getByRole("button", { name: "Projects", exact: true })).toBeVisible()
    await expect(more).toContainText("More")
    await setHeight(frame, 900)
    await expect(more).toHaveCount(0)
  })
}

test("the name sits under the icon, centred, and the badge stays on the icon", async ({ page }) => {
  const frame = await open(page)
  await setHeight(frame, 900)
  const inbox = frame.getByRole("button", { name: "Inbox", exact: true })
  const icon = (await inbox.locator(".fa-shell-rail-icon").boundingBox())!
  const label = (await inbox.locator(".fa-shell-rail-label").boundingBox())!
  const item = (await inbox.boundingBox())!
  const count = (await inbox.locator(".fa-count").boundingBox())!
  expect(label.y).toBeGreaterThanOrEqual(icon.y + icon.height)
  expect(Math.abs(icon.x + icon.width / 2 - (item.x + item.width / 2))).toBeLessThanOrEqual(1)
  expect(Math.abs(label.x + label.width / 2 - (item.x + item.width / 2))).toBeLessThanOrEqual(1)
  expect(item.height).toBeGreaterThanOrEqual(44)
  // On the icon's corner, overlapping it, and inside the tile.
  expect(count.x).toBeLessThan(icon.x + icon.width)
  expect(count.y).toBeLessThan(icon.y + icon.height / 2)
  expect(count.x + count.width).toBeLessThanOrEqual(item.x + item.width)
  expect(count.y).toBeGreaterThanOrEqual(item.y)
  expect((await new AxeBuilder({ page }).include("[data-testid='rail-labels'] nav").analyze()).violations.map((violation) => violation.id)).toEqual([])
})

test("a menu row, focus and the current section behave as they do without labels", async ({ page }) => {
  const frame = await open(page)
  await setHeight(frame, 280)
  const more = frame.getByRole("navigation").getByRole("button", { name: "More", exact: true })
  await more.focus()
  await page.keyboard.press("Enter")
  const menu = page.getByRole("menu", { name: "More" })
  await menu.getByRole("menuitem", { name: "Inbox" }).click()
  await expect(menu).toHaveCount(0)
  const inbox = frame.getByRole("button", { name: "Inbox", exact: true })
  await expect(inbox).toBeVisible()
  await expect(inbox).toHaveAttribute("aria-current", "page")
  await expect(more).toBeFocused()
  await expectFits(frame)

  // The focused item stays out of More while the rail shrinks.
  await inbox.focus()
  await setHeight(frame, 200)
  await expect(inbox).toBeVisible()
  await expect(inbox).toBeFocused()
  await expectFits(frame)
})

test("overflow=scroll keeps every labelled item in the scrolling column", async ({ page }) => {
  const frame = await open(page)
  await setHeight(frame, 280)
  await frame.getByRole("group", { name: "Overflow" }).getByRole("button", { name: "Scroll", exact: true }).click()
  await expect(frame.locator("[data-rail-more]")).toHaveCount(0)
  const list = frame.locator(".fa-shell-rail-list")
  await expect.poll(() => list.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0)
  expect(await list.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0)
})

test("a cut name ends in an ellipsis with the full name in a tooltip; a whole one has no tooltip", async ({ page }) => {
  const frame = await open(page)
  await setHeight(frame, 900)
  const item = (name: string) => frame.getByRole("button", { name, exact: true })
  await item("Inbox").hover()
  await page.waitForTimeout(800)
  await expect(page.getByRole("tooltip")).toHaveCount(0)
  await page.mouse.move(0, 0)

  // A column too narrow for the longer names.
  await page.addStyleTag({ content: ":root { --sidebar-w-rail-labelled: 3rem !important; }" })
  const label = item("Calendar").locator(".fa-shell-rail-label")
  await expect.poll(() => label.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
  expect(await label.evaluate((element) => getComputedStyle(element).textOverflow)).toBe("ellipsis")
  await expectFits(frame)
  await item("Calendar").hover()
  await expect(page.getByRole("tooltip")).toContainText("Calendar")
})

test.describe("in the shell", () => {
  const shellOf = (page: Page) => page.getByTestId("rail-labels-shell").locator(".fa-shell")
  const tracks = (shell: Locator) => shell.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").map(Number.parseFloat))
  const rem = (page: Page, value: number) => page.evaluate((value) => value * Number.parseFloat(getComputedStyle(document.documentElement).fontSize), value)

  for (const [name, appearance] of APPEARANCES) {
    test(`the rail's column follows it under ${name}`, async ({ page }) => {
      await page.addInitScript(([key]) => localStorage.removeItem(key!), [SHELL_STORAGE_KEY])
      await page.setViewportSize({ width: 1440, height: 900 })
      await open(page, appearance)
      const shell = shellOf(page)
      await shell.scrollIntoViewIfNeeded()
      const [railTrack] = await tracks(shell)
      const rail = (await shell.locator(".fa-shell-rail").boundingBox())!
      expect(Math.abs(rail.width - railTrack!)).toBeLessThanOrEqual(0.5)
      expect(railTrack).toBeCloseTo(await rem(page, 5.5), 0)
      // The mark is centred over the rail, the drawer starts after it, and nothing spills.
      const mark = (await shell.locator(".fa-shell-mark").boundingBox())!
      expect(Math.abs(mark.x + mark.width / 2 - (rail.x + rail.width / 2))).toBeLessThanOrEqual(1)
      const drawer = (await shell.locator(".fa-shell-drawer").boundingBox())!
      expect(drawer.x).toBeGreaterThanOrEqual(rail.x + rail.width - 0.5)
      const work = (await shell.locator(".fa-shell-slot-work").boundingBox())!
      expect(work.x).toBeGreaterThanOrEqual(drawer.x + drawer.width - 0.5)
      expect(await shell.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0)
      for (const entry of await shell.locator(".fa-shell-rail-item").all()) {
        const box = (await entry.boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(rail.x)
        expect(box.x + box.width).toBeLessThanOrEqual(rail.x + rail.width + 0.5)
      }
    })
  }

  test("at tablet width the column holds beside the workspace", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 })
    await open(page)
    const shell = shellOf(page)
    await shell.scrollIntoViewIfNeeded()
    const [railTrack] = await tracks(shell)
    expect(railTrack).toBeCloseTo(await rem(page, 5.5), 0)
    const rail = (await shell.locator(".fa-shell-rail").boundingBox())!
    const work = (await shell.locator(".fa-shell-slot-work").boundingBox())!
    expect(work.x).toBeGreaterThanOrEqual(rail.x + rail.width - 0.5)
    expect(await shell.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0)
  })

  test("a shell whose rail has no labels keeps the plain column", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page)
    await page.goto("/components/app-shell")
    const shell = page.locator("#examples .fa-shell").first()
    await expect(shell).toBeVisible({ timeout: 30_000 })
    const [railTrack] = await tracks(shell)
    expect(railTrack).toBeCloseTo(await rem(page, 4.5), 0)
    await expect(shell.locator(".fa-shell-rail[data-labels]")).toHaveCount(0)
  })

  test("reads right to left: the rail is at the inline start, its count at the icon's inline end", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, {}, "?dir=rtl&lang=ar")
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
    const shell = shellOf(page)
    await shell.scrollIntoViewIfNeeded()
    const shellBox = (await shell.boundingBox())!
    const rail = (await shell.locator(".fa-shell-rail").boundingBox())!
    const drawer = (await shell.locator(".fa-shell-drawer").boundingBox())!
    expect(rail.x + rail.width).toBeGreaterThan(shellBox.x + shellBox.width - rail.width)
    expect(drawer.x + drawer.width).toBeLessThanOrEqual(rail.x + 0.5)
    const inbox = shell.getByRole("button", { name: "Inbox", exact: true })
    const icon = (await inbox.locator(".fa-shell-rail-icon").boundingBox())!
    const count = (await inbox.locator(".fa-count").boundingBox())!
    expect(count.x).toBeLessThan(icon.x + icon.width / 2)
    const frame = page.getByTestId("rail-labels")
    await setHeight(frame, 280)
    await expect(frame.getByRole("navigation").locator("[data-rail-more]")).toBeVisible()
    await expectFits(frame)
  })

  test("on a phone the rail leaves the grid, whatever its width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page)
    const shell = shellOf(page)
    expect(await tracks(shell)).toHaveLength(1)
    await expect(shell.locator(".fa-shell-slot-rail")).toBeHidden()
    await expect(shell.locator(".fa-shell-slot-brand")).toBeHidden()
    const work = (await shell.locator(".fa-shell-slot-work").boundingBox())!
    const box = (await shell.boundingBox())!
    expect(work.x).toBeGreaterThanOrEqual(box.x)
    expect(work.x + work.width).toBeLessThanOrEqual(box.x + box.width)
    // The standalone frame still fits at phone width.
    const frame = page.getByTestId("rail-labels")
    await setHeight(frame, 280)
    await expectFits(frame)
  })
})
