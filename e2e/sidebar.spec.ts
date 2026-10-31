import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Locator, type Page } from "@playwright/test"
import { sidebarBootScript } from "../src/ui/sidebar/sidebar-state.js"

/*
 * Sidebar: the shortcut, icon mode (tooltips and flyouts by keyboard and pointer), resizing by
 * drag and keys, persistence that paints the remembered state first, the phone sheet,
 * right-to-left mirroring, skeleton parity and an axe scan of the catalogue page.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })))
})

async function open(page: Page, query = "") {
  await page.goto(`/components/sidebar${query}`)
  const app = page.getByTestId("sidebar-app")
  await expect(app.locator(".fa-sidebar")).toBeAttached({ timeout: 30_000 })
  await app.scrollIntoViewIfNeeded()
  return app
}

const box = async (locator: Locator) => (await locator.boundingBox())!
const paneWidth = (frame: Locator) => frame.locator(".fa-sidebar-pane").evaluate((element) => Math.round(element.getBoundingClientRect().width))

test("⌘B / Ctrl+B toggles the application frame, and its trigger reports it", async ({ page }) => {
  const app = await open(page)
  const sidebar = app.locator(".fa-sidebar")
  const trigger = app.getByRole("button", { name: "Toggle sidebar" })
  await expect(trigger).toHaveAttribute("aria-keyshortcuts", /Control\+B|Meta\+B/)
  await expect(sidebar).toHaveAttribute("data-state", "expanded")
  await page.keyboard.press("ControlOrMeta+b")
  await expect(sidebar).toHaveAttribute("data-state", "collapsed")
  await expect(trigger).toHaveAttribute("aria-expanded", "false")
  await page.keyboard.press("ControlOrMeta+b")
  await expect(sidebar).toHaveAttribute("data-state", "expanded")
  // The other demos opt out (shortcut={false}), so only this one moved.
  await expect(page.getByTestId("sidebar-modes").locator(".fa-sidebar")).toHaveAttribute("data-state", "expanded")
})

test("icon mode labels the icons with tooltips and opens sub-menus as flyouts, by keyboard and pointer", async ({ page }) => {
  const app = await open(page)
  await app.getByRole("button", { name: "Collapse sidebar" }).click()
  const sidebar = app.locator(".fa-sidebar")
  await expect(sidebar).toHaveAttribute("data-state", "collapsed")
  expect(await paneWidth(app)).toBeLessThan(80)

  // A name stays on every item; its label shows as a tooltip on hover.
  const inbox = app.getByRole("link", { name: "Inbox" })
  await inbox.hover()
  await expect(page.getByRole("tooltip")).toHaveText("Inbox")
  const tip = await box(page.getByRole("tooltip"))
  expect(tip.x).toBeGreaterThan((await box(inbox)).x + (await box(inbox)).width - 2)

  // Keyboard: Enter opens the flyout on its first item; Esc closes it back to the icon.
  const projects = app.getByRole("button", { name: "Projects" })
  await projects.focus()
  await page.keyboard.press("Enter")
  const flyout = page.getByRole("menu")
  await expect(flyout).toBeVisible()
  await expect(flyout.getByRole("menuitem")).toHaveCount(3)
  await expect(flyout.getByRole("menuitem", { name: "Atlas redesign" })).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(flyout.getByRole("menuitem", { name: "Billing service" })).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(flyout).toBeHidden()
  await expect(projects).toBeFocused()

  // Pointer: hovering the icon opens it; choosing an item closes it.
  await page.mouse.move(0, 0)
  await projects.hover()
  await expect(flyout).toBeVisible()
  await flyout.getByRole("menuitem", { name: "Field app" }).click()
  await expect(flyout).toBeHidden()
})

test("the rail resizes by drag and by keys, collapses below the minimum and remembers", async ({ page }) => {
  const app = await open(page)
  const rail = app.getByRole("separator", { name: "Resize sidebar" })
  await expect(rail).toHaveAttribute("aria-orientation", "vertical")
  const initial = await paneWidth(app)
  const handle = await box(rail)
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 200)
  await page.mouse.down()
  await page.mouse.move(handle.x + handle.width / 2 + 80, handle.y + 200, { steps: 6 })
  await page.mouse.up()
  const dragged = await paneWidth(app)
  expect(dragged).toBeGreaterThan(initial + 70)

  await rail.focus()
  await page.keyboard.press("ArrowLeft")
  await expect.poll(() => paneWidth(app)).toBe(dragged - 16)
  await page.keyboard.press("Home")
  await expect.poll(() => paneWidth(app)).toBe(224)
  await expect(rail).toHaveAttribute("aria-valuenow", "14")
  await page.keyboard.press("End")
  await expect.poll(() => paneWidth(app)).toBe(448)

  // Dragging below 60% of the minimum collapses it to the icon strip.
  const end = await box(rail)
  await page.mouse.move(end.x + end.width / 2, end.y + 200)
  await page.mouse.down()
  await page.mouse.move(end.x - 380, end.y + 200, { steps: 8 })
  await page.mouse.up()
  await expect(app.locator(".fa-sidebar")).toHaveAttribute("data-state", "collapsed")
  // Enter on the separator expands it again, at the remembered width.
  await rail.focus()
  await page.keyboard.press("Enter")
  await expect(app.locator(".fa-sidebar")).toHaveAttribute("data-state", "expanded")
  await expect.poll(() => paneWidth(app)).toBe(448)
})

test("the remembered state is the first thing painted after a reload", async ({ page }) => {
  const app = await open(page)
  await app.getByRole("separator", { name: "Resize sidebar" }).focus()
  await page.keyboard.press("End")
  await app.getByRole("button", { name: "Collapse sidebar" }).click()
  await expect(app.locator(".fa-sidebar")).toHaveAttribute("data-state", "collapsed")

  // Record the sidebar's state the moment it enters the document and at its first frame.
  await page.addInitScript(() => {
    const seen: Array<{ state: string | null; ready: boolean; width: number }> = []
    ;(window as unknown as { __sidebarFirst: typeof seen }).__sidebarFirst = seen
    new MutationObserver((_, observer) => {
      const element = document.querySelector<HTMLElement>("[data-testid='sidebar-app'] .fa-sidebar")
      if (!element) return
      observer.disconnect()
      seen.push({ state: element.getAttribute("data-state"), ready: element.hasAttribute("data-ready"), width: 0 })
      requestAnimationFrame(() => {
        const pane = element.querySelector(".fa-sidebar-pane")!
        seen.push({ state: element.getAttribute("data-state"), ready: element.hasAttribute("data-ready"), width: pane.getBoundingClientRect().width })
      })
    }).observe(document, { childList: true, subtree: true })
  })
  await page.reload()
  await expect(app.locator(".fa-sidebar")).toHaveAttribute("data-ready", "")
  const first = await page.evaluate(() => (window as unknown as { __sidebarFirst: unknown[] }).__sidebarFirst)
  expect(first[0]).toMatchObject({ state: "collapsed", ready: false })
  expect((first[1] as { width: number }).width).toBeLessThan(80)
  await app.getByRole("button", { name: "Expand sidebar" }).click()
  await expect.poll(() => paneWidth(app)).toBe(448)
})

test("the server-rendered boot script applies the remembered state before React", async ({ page }) => {
  await open(page)
  const result = await page.evaluate((script) => {
    localStorage.setItem("e2e.boot", JSON.stringify({ open: false, width: 20 }))
    const element = document.createElement("div")
    element.setAttribute("data-state", "expanded")
    element.setAttribute("data-collapsible", "icon")
    document.body.append(element)
    const tag = document.createElement("script")
    tag.textContent = script
    element.append(tag)
    const out = { state: element.getAttribute("data-state"), width: element.style.getPropertyValue("--fa-sidebar-width"), mobile: element.hasAttribute("data-mobile") }
    element.remove()
    localStorage.removeItem("e2e.boot")
    return out
  }, sidebarBootScript("e2e.boot", { mobileQuery: "(width < 1px)" }))
  expect(result).toEqual({ state: "collapsed", width: "20rem", mobile: false })
})

test("the phone sheet opens from the trigger and closes on Escape, a destination or a swipe @responsive", async ({ page, isMobile }) => {
  await open(page)
  const frame = page.getByTestId("sidebar-phone")
  await frame.scrollIntoViewIfNeeded()
  await expect(frame.locator(".fa-sidebar")).toHaveAttribute("data-mobile", "")
  const trigger = frame.getByRole("button", { name: "Toggle sidebar" })
  await trigger.click()
  const sheet = page.getByRole("dialog", { name: "Phone navigation" })
  await expect(sheet).toBeVisible()
  // The modal sheet hides the page from assistive technology, so find the trigger by class.
  await expect(frame.locator(".fa-sidebar-trigger")).toHaveAttribute("aria-expanded", "true")
  await page.keyboard.press("Escape")
  await expect(sheet).toBeHidden()
  await expect(trigger).toBeFocused()

  await trigger.click()
  await expect(sheet).toBeVisible()
  await sheet.getByRole("link", { name: "Calendar" }).click()
  await expect(sheet).toBeHidden()

  // A touch swipe towards the sheet's edge dismisses it (mouse drags over content scroll it).
  if (!isMobile) return
  await trigger.click()
  await expect(sheet).toBeVisible()
  const area = await box(sheet)
  const y = area.y + area.height / 2
  const client = await page.context().newCDPSession(page)
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: area.x + area.width * 0.7, y }] })
  for (let step = 1; step <= 12; step++)
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: area.x + area.width * 0.7 - step * 24, y }] })
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
  await expect(sheet).toBeHidden()
})

test("on a phone the application frame's pane gives way to the sheet @responsive", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone viewport only")
  const app = await open(page)
  await expect(app.locator(".fa-sidebar")).toHaveAttribute("data-mobile", "")
  await expect(app.locator(".fa-sidebar")).toBeHidden()
  await app.getByRole("button", { name: "Toggle sidebar" }).click()
  const sheet = page.getByRole("dialog", { name: "Workspace navigation" })
  await expect(sheet).toBeVisible()
  const area = await box(sheet)
  const viewport = page.viewportSize()!
  expect(area.x).toBeLessThan(viewport.width * 0.1)
  expect(area.width).toBeLessThanOrEqual(viewport.width)
  await expect(sheet.getByRole("searchbox", { name: "Filter navigation" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(sheet).toBeHidden()
})

test("right to left: the start sidebar docks on the right, the end one on the left, and the rail grows towards the content", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop layout")
  const app = await open(page, "?dir=rtl&lang=ar")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  const frame = await box(app)
  const pane = await box(app.locator(".fa-sidebar-pane"))
  expect(pane.x + pane.width).toBeGreaterThan(frame.x + frame.width - 4)

  const details = page.getByTestId("sidebar-details")
  await details.scrollIntoViewIfNeeded()
  const detailsFrame = await box(details)
  const end = await box(details.locator(".fa-sidebar[data-side='end'] .fa-sidebar-pane"))
  expect(end.x).toBeLessThan(detailsFrame.x + detailsFrame.width / 2)

  const rail = app.getByRole("separator", { name: "Resize sidebar" })
  const initial = await paneWidth(app)
  await rail.focus()
  await page.keyboard.press("ArrowLeft")
  await expect.poll(() => paneWidth(app)).toBe(initial + 16)
  const handle = await box(rail)
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 200)
  await page.mouse.down()
  await page.mouse.move(handle.x - 60, handle.y + 200, { steps: 6 })
  await page.mouse.up()
  expect(await paneWidth(app)).toBeGreaterThan(initial + 60)
})

test("rich rows read their detail and count, and the filter marks matches and walks into a filling tree", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop layout")
  await open(page)
  const rich = page.getByTestId("sidebar-rich")
  await rich.scrollIntoViewIfNeeded()
  const atlas = rich.getByRole("link", { name: /Atlas launch plan/ })
  await expect(atlas).toHaveAccessibleName(/Atlas launch plan\s*Avery Chen · 10:42\s*3/)
  // The detail line makes the row two lines tall; the count sits at the trailing edge.
  const row = await box(atlas)
  const count = await box(atlas.locator(".fa-sidebar-menu-count"))
  expect(row.height).toBeGreaterThan(44)
  expect(count.x + count.width).toBeGreaterThan(row.x + row.width - 24)
  await rich.getByRole("searchbox", { name: "Filter conversations" }).fill("off")
  await expect(rich.locator("mark")).toHaveText(["off"])
  await expect(rich.getByRole("link", { name: /Field app offline mode/ })).toBeVisible()
  await expect(rich.getByRole("link", { name: /Atlas launch plan/ })).toHaveCount(0)

  const fill = page.getByTestId("sidebar-fill")
  await fill.scrollIntoViewIfNeeded()
  const content = fill.locator(".fa-sidebar-content")
  await expect(content).toHaveAttribute("data-fill", "")
  // The tree, not the content, scrolls: it ends at the content's padding.
  const tree = await box(fill.getByRole("tree", { name: "Sites" }))
  const area = await box(content)
  expect(tree.y + tree.height).toBeLessThanOrEqual(area.y + area.height + 0.5)
  const field = fill.getByRole("searchbox", { name: "Filter sites" })
  await field.focus()
  await page.keyboard.press("ArrowDown")
  await expect(fill.getByRole("treeitem").first()).toBeFocused()
  await page.keyboard.press("ArrowUp")
  await expect(field).toBeFocused()
})

test("loading rows have the loaded rows' geometry", async ({ page }) => {
  await open(page)
  const frame = page.getByTestId("sidebar-loading")
  await frame.scrollIntoViewIfNeeded()
  const row = frame.locator(".fa-sidebar-menu-item").first()
  const skeleton = await box(row)
  const skeletonIcon = await box(row.locator(".fa-sidebar-menu-icon"))
  await page.getByRole("group", { name: "Navigation state" }).getByRole("button", { name: "Loaded", exact: true }).click()
  await expect(frame.getByRole("link", { name: "Atlas redesign" })).toBeVisible()
  const loaded = await box(row)
  const loadedIcon = await box(row.locator(".fa-sidebar-menu-icon"))
  expect(loaded.height).toBeCloseTo(skeleton.height, 0)
  expect(loadedIcon.x).toBeCloseTo(skeletonIcon.x, 0)
  expect(loadedIcon.y).toBeCloseTo(skeletonIcon.y, 0)
})

test("the catalogue page passes axe, expanded and as an icon strip", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop layout")
  const app = await open(page)
  const scan = async () => {
    const result = await new AxeBuilder({ page }).include("#examples").analyze()
    expect(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([])
  }
  await scan()
  await app.getByRole("button", { name: "Collapse sidebar" }).click()
  await expect(app.locator(".fa-sidebar")).toHaveAttribute("data-state", "collapsed")
  await scan()
})
