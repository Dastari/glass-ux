import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Locator, type Page } from "@playwright/test"

/*
 * Sheet: snap points (drag, keyboard, touch hand-off from the body), non-modal sheets beside
 * a usable page, and nested sheets that stack and hand focus back.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })))
  await page.goto("components/sheet/")
})

const button = (scope: Page | Locator, name: string) => scope.getByRole("button", { name, exact: true }).first()
const row = (scope: Locator, name: string) => scope.getByRole("button", { name: new RegExp(`^${name}\\b`) })
const openSheets = (page: Page) => page.locator("[role=dialog][data-open]")
/** The demo's Peek · Half · Full segmented control. */
const heights = (page: Page) => page.locator(".fa-segmented", { has: page.getByText("Peek", { exact: true }) }).first()
const handle = (page: Page) => page.getByRole("slider", { name: "Sheet height" })
/** The top of the open snap sheet, in px from the top of the viewport. */
const sheetTop = async (page: Page) => (await page.locator(".fa-dialog[data-snap-points]").boundingBox())!.y
const axe = async (page: Page, include: string) => {
  const result = await new AxeBuilder({ page }).include(include).analyze()
  expect(result.violations, JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 1)).toEqual([])
}

async function openSnapSheet(page: Page) {
  await button(page, "Peek · half · full").click()
  await expect(openSheets(page)).toHaveCount(1)
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "Peek")
  // The open slide has settled when the top stops moving.
  await expect.poll(async () => { const a = await sheetTop(page); await page.waitForTimeout(80); return a - (await sheetTop(page)) }).toBe(0)
}

test("snap points: the handle is a slider over the points", async ({ page }) => {
  await openSnapSheet(page)
  const slider = handle(page)
  await expect(slider).toHaveAttribute("aria-valuemin", "1")
  await expect(slider).toHaveAttribute("aria-valuemax", "3")
  await expect(slider).toHaveAttribute("aria-valuenow", "1")
  await expect(slider).toHaveAttribute("aria-orientation", "vertical")
  const body = page.locator(".fa-dialog[data-snap-points] .fa-dialog-body")
  // Below the highest point the body does not scroll, so a drag on it moves the sheet.
  await expect(body).toHaveCSS("overflow-y", "hidden")
  const peek = await sheetTop(page)

  await slider.focus()
  await page.keyboard.press("ArrowUp")
  await expect(slider).toHaveAttribute("aria-valuetext", "Half")
  await expect.poll(() => sheetTop(page)).toBeLessThan(peek - 100)
  await page.keyboard.press("End")
  await expect(slider).toHaveAttribute("aria-valuetext", "Full")
  await expect(slider).toHaveAttribute("aria-valuenow", "3")
  await expect(body).toHaveCSS("overflow-y", "auto")
  await page.keyboard.press("ArrowUp")
  await expect(slider).toHaveAttribute("aria-valuenow", "3")
  await page.keyboard.press("ArrowDown")
  await expect(slider).toHaveAttribute("aria-valuetext", "Half")
  await page.keyboard.press("Home")
  await expect(slider).toHaveAttribute("aria-valuetext", "Peek")
  await expect.poll(() => sheetTop(page)).toBeCloseTo(peek, 0)
  // A press raises it one point, and from the highest back to the lowest.
  await slider.click()
  await expect(slider).toHaveAttribute("aria-valuetext", "Half")
  // Esc still closes it, and focus returns to the trigger.
  await page.keyboard.press("Escape")
  await expect(openSheets(page)).toHaveCount(0)
  await expect(button(page, "Peek · half · full")).toBeFocused()
})

test("snap points: dragging the handle settles on a point, and below the lowest it closes", async ({ page }) => {
  await openSnapSheet(page)
  const viewport = page.viewportSize()!
  const box = (await handle(page).boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  // A slow drag to about the middle of the viewport rests at Half.
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let step = 1; step <= 20; step++) {
    await page.mouse.move(x, y - ((y - viewport.height / 2) * step) / 20)
    await page.waitForTimeout(16)
  }
  await page.waitForTimeout(120)
  await page.mouse.up()
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "Half")
  await expect.poll(() => sheetTop(page)).toBeCloseTo(viewport.height / 2, -1)

  // A drag well below the lowest point closes it.
  const from = (await handle(page).boundingBox())!
  await page.mouse.move(x, from.y + from.height / 2)
  await page.mouse.down()
  for (let step = 1; step <= 10; step++) {
    await page.mouse.move(x, from.y + (viewport.height - from.y) * (step / 10))
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
  await expect(openSheets(page)).toHaveCount(0)
})

test("snap points: scrolling the body raises the sheet before the body scrolls", async ({ page }) => {
  await openSnapSheet(page)
  const body = page.locator(".fa-dialog[data-snap-points] .fa-dialog-body")
  await body.hover()
  await page.mouse.wheel(0, 120)
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "Half")
  await expect.poll(async () => body.evaluate((element) => element.scrollTop)).toBe(0)
  // A new gesture raises it again; at the highest point the wheel no longer moves the sheet.
  await page.waitForTimeout(300)
  await page.mouse.wheel(0, 120)
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "Full")
  await page.waitForTimeout(300)
  await page.mouse.wheel(0, -120)
  await page.waitForTimeout(300)
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "Full")
})

test("snap points: focus reaching a control below the visible part raises the sheet", async ({ page }) => {
  await openSnapSheet(page)
  await page.locator(".fa-dialog[data-snap-points] .fa-dialog-body .fa-item").last().focus()
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "Full")
})

test("snap points: a controlled point follows the page's control", async ({ page }) => {
  // Keep the page's control above the half-height sheet.
  await button(page, "Fleet sheet").evaluate((element) => element.scrollIntoView({ block: "start" }))
  await page.mouse.wheel(0, -120)
  await button(page, "Fleet sheet").click()
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "Half")
  await heights(page).getByText("Peek", { exact: true }).filter({ visible: true }).click()
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "Peek")
  await handle(page).focus()
  await page.keyboard.press("End")
  await expect(heights(page).locator("[data-pressed]").filter({ visible: true })).toHaveText("Full")
})

test("non-modal: no scrim, the page stays usable and Esc closes it", async ({ page }) => {
  const list = page.getByRole("list", { name: "Endpoints" })
  await row(list, "NST-C106").click()
  const sheet = openSheets(page)
  await expect(sheet).toHaveCount(1)
  await expect(sheet.locator(".fa-dialog-title")).toHaveText("NST-C106")
  await expect(page.locator(".fa-scrim")).toHaveCount(0)
  // Focus stays on the page (initialFocus={false}), and a second row updates the sheet.
  await expect(row(list, "NST-C106")).toBeFocused()
  await row(list, "NST-L214").click()
  await expect(sheet).toHaveCount(1)
  await expect(sheet.locator(".fa-dialog-title")).toHaveText("NST-L214")
  // The page scrolls and Tab moves on through the page.
  const box = (await list.boundingBox())!
  // Over the page, beside the sheet.
  await page.mouse.move(box.x + box.width / 2, page.viewportSize()!.height / 2)
  await page.mouse.wheel(0, 200)
  await expect.poll(async () => (await list.boundingBox())!.y).toBeLessThan(box.y - 50)
  await list.scrollIntoViewIfNeeded()
  await row(list, "NST-L214").focus()
  await page.keyboard.press("Tab")
  await expect(row(list, "NST-D031")).toBeFocused()
  await expect(sheet).toHaveCount(1)
  await axe(page, ".fa-dialog-side-viewport")
  await page.keyboard.press("Escape")
  await expect(openSheets(page)).toHaveCount(0)
})

test("nested: the second sheet stacks, the first recedes, and closing returns focus to it", async ({ page }) => {
  const trigger = button(page, "Side · move endpoint")
  await trigger.focus()
  await page.keyboard.press("Enter")
  const parent = openSheets(page).first()
  await expect(parent).toBeVisible()
  await button(parent, "Move…").focus()
  await page.keyboard.press("Enter")
  await expect(openSheets(page)).toHaveCount(2)
  await expect(parent).toHaveAttribute("data-nested-drawer-open", "")
  // One scrim: the parent's. The parent shrinks and moves toward the page.
  await expect(page.locator(".fa-scrim")).toHaveCount(1)
  await expect.poll(() => parent.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a)).toBeCloseTo(0.97, 2)
  const child = openSheets(page).last()
  await expect(child.locator(".fa-dialog-title")).toHaveText("Move to organisation")
  await axe(page, ".fa-dialog-side-viewport")

  await page.keyboard.press("Escape")
  await expect(openSheets(page)).toHaveCount(1)
  await expect(button(parent, "Move…")).toBeFocused()
  await expect.poll(() => parent.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a)).toBe(1)

  // A choice in the nested sheet closes only that sheet and updates the parent.
  await button(parent, "Move…").click()
  await button(openSheets(page).last(), "Orbit Workspace").click()
  await expect(openSheets(page)).toHaveCount(1)
  await expect(parent.locator(".fa-dialog-subtitle")).toHaveText("Orbit Workspace")
  await page.keyboard.press("Escape")
  await expect(openSheets(page)).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test("snap points pass axe", async ({ page }) => {
  await openSnapSheet(page)
  await axe(page, ".fa-dialog-side-viewport")
})

test("@responsive phone: a touch drag on the body raises a snap sheet, and the nested bottom sheet stacks", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "touch hand-off is a phone case")
  await openSnapSheet(page)
  const viewport = page.viewportSize()!
  const sheet = page.locator(".fa-dialog[data-snap-points]")
  await expect.poll(async () => (await sheet.boundingBox())!.width).toBe(viewport.width)
  const row = (await sheet.locator(".fa-dialog-body .fa-item").first().boundingBox())!
  const client = await page.context().newCDPSession(page)
  const x = row.x + row.width / 2
  const y = row.y + row.height / 2
  const touch = (type: string, dy: number) =>
    client.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y: y + dy }] })
  await touch("touchStart", 0)
  for (let step = 1; step <= 12; step++) {
    await touch("touchMove", -((y - viewport.height * 0.45) * step) / 12)
    await page.waitForTimeout(16)
  }
  await page.waitForTimeout(150)
  await touch("touchEnd", 0)
  await expect(handle(page)).toHaveAttribute("aria-valuetext", "Half")
  await page.keyboard.press("Escape")
  await expect(openSheets(page)).toHaveCount(0)

  await button(page, "Bottom · actions").click()
  const parent = openSheets(page).first()
  await button(parent, "Run script…").click()
  await expect(openSheets(page)).toHaveCount(2)
  const child = openSheets(page).last()
  // The parent's top shows above the sheet in front.
  await expect.poll(async () => (await child.boundingBox())!.y - (await parent.boundingBox())!.y).toBeGreaterThan(4)
  await button(child, "Flush DNS cache").click()
  await expect(openSheets(page)).toHaveCount(1)
})
