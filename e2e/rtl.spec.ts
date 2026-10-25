import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Locator } from "@playwright/test"
import { componentFamilies } from "../src/gallery/component-families.js"

const width = (locator: Locator) => locator.evaluate(element => element.getBoundingClientRect().width)
const centre = (locator: Locator) => locator.evaluate(element => { const box = element.getBoundingClientRect(); return box.left + box.width / 2 })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })))
})

test("RTL layout, icons, keyboard and pointer controls @responsive", async ({ page }) => {
  await page.goto("/foundations/locale?dir=rtl&lang=ar")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(page.locator("html")).toHaveAttribute("lang", "ar")
  const demo = page.getByTestId("direction-demo")
  const tabs = demo.getByRole("tab")
  await expect(tabs).toHaveCount(3)
  expect(await centre(tabs.nth(0))).toBeGreaterThan(await centre(tabs.nth(1)))
  await tabs.first().focus()
  await page.keyboard.press("ArrowLeft")
  await expect(tabs.nth(1)).toBeFocused()

  const crumbs = demo.locator(".fa-breadcrumb")
  const icon = crumbs.locator('[data-icon="chevron-right"]').first()
  await expect(icon).toHaveCSS("scale", "-1 1")
  const segments = demo.getByRole("group", { name: "Direction segments" }).getByRole("button")
  expect(await centre(segments.nth(0))).toBeGreaterThan(await centre(segments.nth(1)))
  await segments.first().focus()
  await page.keyboard.press("ArrowLeft")
  await expect(segments.nth(1)).toBeFocused()

  const slider = demo.getByRole("slider", { name: "Direction level" })
  await slider.focus()
  const before = Number(await slider.getAttribute("aria-valuenow"))
  await page.keyboard.press("ArrowLeft")
  await expect(slider).toHaveAttribute("aria-valuenow", String(before + 1))
  await page.keyboard.press("ArrowRight")
  await expect(slider).toHaveAttribute("aria-valuenow", String(before))
  const track = demo.locator(".fa-slider-track")
  const box = (await track.boundingBox())!
  await page.mouse.click(box.x + box.width / 4, box.y + box.height / 2)
  expect(Number(await slider.getAttribute("aria-valuenow"))).toBeGreaterThan(65)
  const fill = demo.locator(".fa-slider-fill")
  const fillBox = (await fill.boundingBox())!
  expect(fillBox.x + fillBox.width).toBeGreaterThanOrEqual(box.x + box.width - 1)

  const tree = demo.getByRole("tree", { name: "Direction folders" })
  await tree.focus()
  const folder = tree.getByRole("treeitem", { name: "Documents" })
  await page.keyboard.press("ArrowLeft")
  await expect(folder).toHaveAttribute("aria-expanded", "true")
  await expect(folder.locator('.fa-tree-chevron .fa-icon')).toHaveCSS("rotate", "-90deg")
  await page.keyboard.press("ArrowRight")
  await expect(folder).toHaveAttribute("aria-expanded", "false")

  const split = demo.getByTestId("direction-split")
  const start = split.locator('[data-pane="start"]')
  const separator = split.getByRole("separator")
  const initial = await width(start)
  await separator.focus()
  await page.keyboard.press("ArrowLeft")
  expect(await width(start)).toBeGreaterThan(initial)
  const handle = (await separator.boundingBox())!
  const afterKey = await width(start)
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 30)
  await page.mouse.down()
  await page.mouse.move(handle.x - 24, handle.y + 30, { steps: 4 })
  await page.mouse.up()
  expect(await width(start)).toBeGreaterThan(afterKey + 20)

  const pagination = demo.getByRole("navigation", { name: "Direction pages" })
  await expect(pagination.locator('[data-icon-dir="mirror"]').first()).toHaveCSS("scale", "-1 1")
  await demo.getByRole("button", { name: "Open start sheet" }).click()
  const sheet = page.getByRole("dialog", { name: "Start sheet" })
  await expect(sheet).toBeVisible()
  expect(await centre(sheet)).toBeGreaterThan(page.viewportSize()!.width / 2)
  await page.keyboard.press("Escape")
  await expect(sheet).toBeHidden()
  const result = await new AxeBuilder({ page }).include('[data-testid="direction-demo"]').analyze()
  expect(result.violations).toEqual([])
})

test("submenu opens toward the reading end, and nested providers reach portals", async ({ page }) => {
  await page.goto("/foundations/locale?dir=rtl&lang=ar")
  const demo = page.getByTestId("direction-demo")
  await demo.getByRole("button", { name: "Direction menu" }).click()
  const submenu = page.getByRole("menuitem", { name: "Export" })
  await submenu.focus()
  await page.keyboard.press("ArrowLeft")
  const child = page.getByRole("menuitem", { name: "Document", exact: true })
  await expect(child).toBeVisible()
  expect(await centre(child)).toBeLessThan(await centre(submenu))
  await expect(child.locator("xpath=ancestor::*[@dir][1]")).toHaveAttribute("dir", "rtl")
  await page.keyboard.press("Escape")
  await page.keyboard.press("Escape")
  await page.getByRole("group", { name: "Reading direction" }).getByRole("button", { name: "Left to right", exact: true }).click()
  // A direction change repositions an existing selection even when its value and width stay the same.
  await expect.poll(() => demo.locator('.fa-segmented[aria-label="Direction segments"]').evaluate(element => {
    const selected = element.querySelector<HTMLElement>('[data-pressed]')!
    const indicator = element.querySelector<HTMLElement>('.fa-glide')!
    return Math.abs(Number.parseFloat(indicator.style.getPropertyValue('--glide-start')) - selected.offsetLeft)
  })).toBeLessThan(2)
  await demo.getByRole("button", { name: "Open start sheet" }).click()
  const sheet = page.getByRole("dialog", { name: "Start sheet" })
  await expect(sheet).toBeVisible()
  expect(await centre(sheet)).toBeLessThan(page.viewportSize()!.width / 2)
  await expect(sheet.locator("xpath=ancestor::*[@dir][1]")).toHaveAttribute("dir", "ltr")
})

test("RTL shell drawer grows towards the reading end", async ({ page }) => {
  await page.goto("/components/app-shell?dir=rtl&lang=ar")
  const shell = page.locator("#examples .fa-shell").first()
  const drawer = shell.locator(".fa-shell-slot-drawer > .fa-shell-drawer")
  const handle = shell.getByRole("separator", { name: "Resize section navigation" })
  const work = shell.locator(".fa-shell-slot-work")
  await expect(drawer).toBeVisible()
  expect(await centre(drawer)).toBeGreaterThan(await centre(work))
  const initial = await width(drawer)
  await handle.focus()
  await page.keyboard.press("ArrowLeft")
  await expect.poll(() => width(drawer)).toBeGreaterThan(initial)
  const afterKey = await width(drawer)
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x - 24, box.y + box.height / 2, { steps: 4 })
  await page.mouse.up()
  await expect.poll(() => width(drawer)).toBeGreaterThan(afterKey + 20)
})

test("RTL window snap shortcuts follow reading direction", async ({ page }) => {
  await page.goto("/components/workspace?dir=rtl&lang=ar")
  await page.getByRole("button", { name: "Connect" }).first().click()
  const frame = page.locator('[data-window-kind="gallery.screen"]')
  await expect(frame).toBeVisible()
  await frame.getByRole("button", { name: "Close Remote control" }).focus()
  await page.keyboard.press("Control+Alt+ArrowLeft")
  await expect(frame).toHaveAttribute("data-snap", "right-half")
  await page.keyboard.press("Control+Alt+ArrowRight")
  await expect(frame).not.toHaveAttribute("data-snap")
})

test("the RTL phone shell opens navigation from the reading start @responsive", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 })
  await page.goto("/components/app-shell?dir=rtl&lang=ar")
  const shell = page.locator("#examples .fa-shell").first()
  await shell.getByRole("button", { name: "Section navigation", exact: true }).click()
  const drawer = page.locator('.fa-dialog[data-edge="right"]')
  await expect(drawer).toBeVisible()
  expect(await centre(drawer)).toBeGreaterThan(393 / 2)
  await page.keyboard.press("Escape")
  await expect(drawer).toBeHidden()
})

test("RTL desktop toasts dismiss toward the trailing edge", async ({ page }) => {
  await page.goto("/components/toaster?dir=rtl&lang=ar")
  await page.getByRole("button", { name: "Show success toast", exact: true }).click()
  const toast = page.locator('.fa-toast-viewport .fa-toast').first()
  await expect(toast).toBeVisible()
  expect(await centre(toast)).toBeLessThan(page.viewportSize()!.width / 2)
  const box = (await toast.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect(toast).toBeHidden({ timeout: 1500 })
})

test("RTL logical-side tooltips point back towards their anchor", async ({ page }) => {
  await page.goto("/components/tooltip?dir=rtl&lang=ar")
  const trigger = page.getByRole("button", { name: "inline-end", exact: true })
  await trigger.hover()
  const tooltip = page.locator('.fa-tooltip[data-side="inline-end"]')
  await expect(tooltip).toBeVisible()
  expect(await centre(tooltip)).toBeLessThan(await centre(trigger))
  await expect(tooltip.locator('.fa-tooltip-arrow')).toHaveCSS("rotate", "-90deg")
})

test("static action menu previews keep horizontal scrolling local @responsive", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 852 })
  await page.goto("/components/action-bar?dir=rtl&lang=ar")
  const preview = page.locator('.fa-action-menu-preview:has(.fa-action-submenu-preview)').first()
  await expect(preview).toBeVisible()
  await expect(preview).toHaveAttribute("role", "region")
  await preview.focus()
  await expect(preview).toBeFocused()
  expect(await preview.evaluate(element => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0)
  await expect.poll(() => page.locator(".docs-content").evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
})

// Reuse the overflow audit's component-family traversal, checking the bounded document
// scroller as well as the viewport. Intentional chart/table scrollers remain local.
const paths = componentFamilies.filter(family => family.id !== "data-table").map(family => `/components/${family.id}`)
for (let chunk = 0; chunk < Math.ceil(paths.length / 12); chunk++) {
  test(`RTL component pages contain horizontal overflow ${chunk} @responsive`, async ({ page }) => {
    test.setTimeout(240_000)
    for (const path of paths.slice(chunk * 12, (chunk + 1) * 12)) {
      await page.goto(`${path}?dir=rtl&lang=ar`)
      await expect(page.locator(".gallery-document-intro h1")).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await expect.poll(() => page.locator(".docs-content").evaluate(element => element.scrollWidth - element.clientWidth), { message: path }).toBeLessThanOrEqual(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), path).toBeLessThanOrEqual(1)
    }
  })
}
