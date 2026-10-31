import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Locator, type Page } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glass-ux.appearance.v1", JSON.stringify({ motion: "reduced", mode: "light" })))
})

async function open(page: Page) {
  await page.goto("./components/on-screen-keyboard")
  await expect(specimen(page, "TV search")).toBeVisible()
}

/** A catalogue specimen: a section named by its title, prefixed with the component it documents when it sits under another one. */
const specimen = (page: Page, title: string) => page.locator(`section.gallery-specimen[aria-label="${title}"], section.gallery-specimen[aria-label$=": ${title}"]`)
const key = (scope: Locator, name: string) => scope.getByRole("button", { name, exact: true })
const box = async (locator: Locator) => (await locator.boundingBox())!
/** Hold a key down for longer than the 500 ms press-and-hold threshold. */
const hold = (page: Page) => page.waitForTimeout(650)

test("TV search: the arrow keys move spatially, leave the keys to the results and come back", async ({ page }) => {
  await open(page)
  const tv = specimen(page, "TV search")
  const keys = tv.getByRole("group", { name: "English keyboard" })
  await keys.locator('[data-osk-key][tabindex="0"]').focus()
  // The wide Space and Backspace keys span three columns each.
  await expect(page.locator(":focus")).toHaveAccessibleName("Space")
  const presses = async (names: string[], keyName: string) => {
    await page.keyboard.press(keyName)
    names.push(await page.evaluate(() => (document.activeElement as HTMLElement).textContent?.trim() ?? ""))
  }
  const visited: string[] = []
  for (const arrow of ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowUp", "ArrowUp"]) await presses(visited, arrow)
  // Space spans columns 1–3, so Down lands on b; then h, n; Up returns to h, b.
  expect(visited).toEqual(["b", "h", "n", "h", "b"])
  await page.keyboard.press("ArrowUp")
  await expect(page.locator(":focus")).toHaveAccessibleName("Space")
  await page.keyboard.press("ArrowRight")
  await expect(page.locator(":focus")).toHaveAccessibleName("Backspace")
  await page.keyboard.press("ArrowDown")
  await expect(page.locator(":focus")).toHaveText("e")
  await page.keyboard.press("ArrowRight")
  await expect(page.locator(":focus")).toHaveText("f")

  // At the right edge the arrows leave the keys, to the first result tile.
  await page.keyboard.press("ArrowRight")
  await expect(page.locator(":focus")).toHaveAttribute("data-tile", "")
  await expect(page.locator(":focus")).toContainText("Harbour Lights")
  await page.keyboard.press("ArrowRight")
  await expect(page.locator(":focus")).toContainText("The Lantern Keepers")
  await page.keyboard.press("ArrowLeft")
  await page.keyboard.press("ArrowLeft")
  // Left from the first column returns to the key that was active.
  await expect(page.locator(":focus")).toHaveText("f")
})

test("TV search: keys and physical typing update the query and the results", async ({ page }) => {
  await open(page)
  const tv = specimen(page, "TV search")
  const query = tv.locator(".gallery-osk-tv-query-text")
  const tiles = tv.locator("[data-tile]")
  await expect(query).toHaveText("Search")
  await expect(tiles).toHaveCount(9)
  await key(tv, "h").click()
  await expect(query).toHaveText("h")
  await expect(tiles).toHaveCount(4)
  // The key keeps focus after a pointer press, and Enter presses the focused key.
  await key(tv, "o").focus()
  await page.keyboard.press("Enter")
  await expect(query).toHaveText("ho")
  await expect(tiles).toHaveCount(2)
  // Typing on the physical keyboard while a key has focus inserts text.
  await page.keyboard.type("lli")
  await expect(query).toHaveText("holli")
  await expect(tiles).toHaveCount(1)
  await expect(tiles.first()).toContainText("Hollis Street")
  await page.keyboard.press("Backspace")
  await expect(query).toHaveText("holl")
  await expect(tiles).toHaveCount(2)
  await key(tv, "Backspace").click()
  await key(tv, "Backspace").click()
  await key(tv, "Backspace").click()
  await key(tv, "Backspace").click()
  await expect(query).toHaveText("Search")
  await expect(tiles).toHaveCount(9)
})

test("typing into an input keeps focus and the caret, deletes a grapheme and follows Shift", async ({ page }) => {
  await open(page)
  const typing = specimen(page, "Typing into an input")
  const input = typing.getByRole("textbox", { name: "Message" })
  const keys = typing.getByRole("group", { name: "English keyboard" })
  const state = () => page.evaluate(() => {
    const element = document.activeElement as HTMLInputElement
    return { tag: element.tagName, value: element.value, caret: element.selectionStart }
  })
  await input.click()
  await key(keys, "h").click()
  await key(keys, "i").click()
  expect(await state()).toEqual({ tag: "INPUT", value: "hi", caret: 2 })

  // The caret stays where it was put: typing in the middle.
  await input.evaluate((element: HTMLInputElement) => element.setSelectionRange(1, 1))
  await key(keys, "a").click()
  expect(await state()).toEqual({ tag: "INPUT", value: "hai", caret: 2 })

  // Backspace removes a whole grapheme, here an emoji sequence of several code points.
  await input.fill("")
  await page.keyboard.insertText("a👨‍👩‍👧")
  await key(keys, "Backspace").click()
  expect(await state()).toEqual({ tag: "INPUT", value: "a", caret: 1 })
  await key(keys, "Backspace").click()
  expect(await state()).toEqual({ tag: "INPUT", value: "", caret: 0 })

  // Shift applies to the next letter only.
  const shift = key(keys, "Shift")
  await expect(shift).toHaveAttribute("aria-pressed", "false")
  await shift.click()
  await expect(shift).toHaveAttribute("aria-pressed", "true")
  await key(keys, "Q").click()
  await expect(shift).toHaveAttribute("aria-pressed", "false")
  await key(keys, "w").click()
  expect((await state()).value).toBe("Qw")

  // Two quick presses are Caps Lock: the key changes its name until it is pressed again.
  await shift.click()
  await shift.click()
  const lock = key(keys, "Caps Lock")
  await expect(lock).toHaveAttribute("aria-pressed", "true")
  await key(keys, "E").click()
  await key(keys, "R").click()
  expect((await state()).value).toBe("QwER")
  await lock.click()
  await expect(key(keys, "Shift")).toHaveAttribute("aria-pressed", "false")
  await key(keys, "t").click()
  expect((await state()).value).toBe("QwERt")
})

test("switching to the symbols layer keeps the keyboard's size", async ({ page }) => {
  await open(page)
  const typing = specimen(page, "Typing into an input")
  const keys = typing.getByRole("group", { name: "English keyboard" })
  await typing.getByRole("textbox", { name: "Message" }).click()
  const grid = keys.locator(".fa-osk-grid")
  const before = await box(grid)
  await key(keys, "Symbols").click()
  await expect(keys).toHaveAttribute("data-layer", "symbols")
  const symbols = await box(grid)
  expect(symbols.height).toBeCloseTo(before.height, 1)
  expect(symbols.width).toBeCloseTo(before.width, 1)
  await key(keys, "1").click()
  await expect(typing.getByRole("textbox", { name: "Message" })).toHaveValue("1")
  await key(keys, "More symbols").click()
  await expect(keys).toHaveAttribute("data-layer", "symbols2")
  expect((await box(grid)).height).toBeCloseTo(before.height, 1)
  await key(keys, "Letters").click()
  await expect(keys).toHaveAttribute("data-layer", "default")
  expect((await box(grid)).height).toBeCloseTo(before.height, 1)
  await expect(typing.getByRole("textbox", { name: "Message" })).toBeFocused()
})

test("press and hold on a key opens its alternates, by pointer and by keyboard", async ({ page }) => {
  await open(page)
  const typing = specimen(page, "Typing into an input")
  const input = typing.getByRole("textbox", { name: "Message" })
  const keys = typing.getByRole("group", { name: "English keyboard" })
  const strip = typing.getByRole("listbox", { name: "Alternatives for e" })
  const options = strip.getByRole("option")
  await input.click()

  // Pointer: hold for 600 ms, slide to the second option and release.
  const e = await box(key(keys, "e"))
  await page.mouse.move(e.x + e.width / 2, e.y + e.height / 2)
  await page.mouse.down()
  await expect(strip).toHaveCount(0)
  await hold(page)
  await expect(strip).toBeVisible()
  const second = await options.nth(1).innerText()
  const target = await box(options.nth(1))
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2)
  await page.mouse.up()
  await expect(strip).toHaveCount(0)
  await expect(input).toHaveValue(second)
  await expect(input).toBeFocused()

  // Keyboard: a held Enter opens the strip, the arrows move, Enter picks.
  await page.mouse.move(0, 0)
  await input.fill("")
  await key(keys, "e").focus()
  await page.keyboard.down("Enter")
  await hold(page)
  await page.keyboard.up("Enter")
  await expect(strip).toBeVisible()
  await expect(options.first()).toHaveAttribute("aria-selected", "true")
  const third = await options.nth(1).innerText()
  await page.keyboard.press("ArrowRight")
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true")
  await page.keyboard.press("Enter")
  await expect(strip).toHaveCount(0)
  await expect(input).toHaveValue(third)
  // Focus returns to the key that opened it.
  await expect(key(keys, "e")).toBeFocused()

  // Escape closes the strip without typing, and a short press types the plain letter.
  await input.fill("")
  await key(keys, "e").focus()
  await page.keyboard.down("Enter")
  await hold(page)
  await page.keyboard.up("Enter")
  await expect(strip).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(strip).toHaveCount(0)
  await expect(input).toHaveValue("")
  await page.keyboard.press("Enter")
  await expect(input).toHaveValue("e")
})

test("languages: Arabic and Hebrew keep their physical key positions in a right-to-left region", async ({ page }) => {
  await open(page)
  const languages = specimen(page, "Languages")
  const panel = languages.locator(".gallery-osk-pad[dir]")
  const picker = languages.getByRole("combobox", { name: "Layout" })
  const announcer = languages.locator('.fa-osk [aria-live="polite"]')
  await expect(languages.getByRole("group", { name: "Deutsch keyboard" })).toBeVisible()
  await expect(panel).toHaveAttribute("dir", "ltr")

  await picker.click()
  await page.getByRole("option", { name: "العربية" }).click()
  const arabic = languages.getByRole("group", { name: "العربية keyboard" })
  await expect(arabic).toBeVisible()
  await expect(panel).toHaveAttribute("dir", "rtl")
  await expect(arabic.locator(".fa-osk-grid")).toHaveAttribute("dir", "ltr")
  // Top row, physical positions: ض then ص from the left.
  const dad = await box(key(arabic, "ض"))
  const sad = await box(key(arabic, "ص"))
  expect(dad.x + dad.width).toBeLessThanOrEqual(sad.x + 1)
  expect(Math.abs(dad.y - sad.y)).toBeLessThan(1)

  // The globe key cycles to the next layout and announces it.
  await key(arabic, "Switch to עברית").click()
  const hebrew = languages.getByRole("group", { name: "עברית keyboard" })
  await expect(hebrew).toBeVisible()
  await expect(announcer).toHaveText("עברית keyboard")
  await expect(picker).toContainText("עברית")
  // Top row of the Hebrew layout: / then ' from the left.
  const slash = await box(key(hebrew, "/"))
  const quote = await box(key(hebrew, "'"))
  expect(slash.x + slash.width).toBeLessThanOrEqual(quote.x + 1)
  // The input takes the typed letter; the globe key carries on through the list and wraps to the first layout.
  const text = languages.getByRole("textbox", { name: "Text" })
  await text.click()
  await key(hebrew, "ק").click()
  await expect(text).toHaveValue("ק")
  await key(hebrew, "Switch to 日本語 かな").click()
  await expect(announcer).toHaveText("日本語 かな keyboard")
  const hangul = languages.getByRole("group", { name: "日本語 かな keyboard" })
  await key(hangul, "Switch to 한국어").click()
  await expect(announcer).toHaveText("한국어 keyboard")
  await key(languages.getByRole("group", { name: "한국어 keyboard" }), "Switch to Deutsch").click()
  await expect(languages.getByRole("group", { name: "Deutsch keyboard" })).toBeVisible()
  await expect(announcer).toHaveText("Deutsch keyboard")
  await expect(panel).toHaveAttribute("dir", "ltr")
})

test("PIN pad: digits fill the dots and Backspace empties one", async ({ page }) => {
  await open(page)
  const pins = specimen(page, "PIN and phone")
  const pad = pins.getByRole("group", { name: "PIN pad" })
  const display = pins.getByRole("img", { name: /^PIN, / })
  const dots = pins.locator(".gallery-osk-pin-dot")
  const filled = pins.locator(".gallery-osk-pin-dot[data-filled]")
  await expect(dots).toHaveCount(4)
  await expect(filled).toHaveCount(0)
  await key(pad, "2").click()
  await key(pad, "5").click()
  await expect(filled).toHaveCount(2)
  await expect(display).toHaveAccessibleName("PIN, 2 of 4 digits entered")
  await key(pad, "Backspace").click()
  await expect(filled).toHaveCount(1)
  await expect(display).toHaveAccessibleName("PIN, 1 of 4 digits entered")
  await key(pad, "5").click()
  await key(pad, "8").click()
  await key(pad, "0").click()
  await expect(filled).toHaveCount(4)
  await expect(pins.getByText("Unlocked")).toBeVisible()
  // Only digits: the pad has no letters.
  await expect(pad.locator('[data-action="insert"]')).toHaveCount(10)
})

test("the kiosk drawer follows focus: opens, types, retargets, closes on Escape and sets the inset", async ({ page }) => {
  await open(page)
  const kiosk = specimen(page, "Kiosk sign-in")
  const frame = kiosk.locator(".gallery-osk-frame")
  const drawer = frame.locator(".fa-osk-drawer")
  const name = kiosk.getByRole("textbox", { name: "Name" })
  const email = kiosk.getByRole("textbox", { name: "Email" })
  const inset = () => frame.evaluate((element) => (element as HTMLElement).style.getPropertyValue("--keyboard-inset-height"))
  await frame.scrollIntoViewIfNeeded()
  await expect(drawer).toHaveCount(0)
  expect(await inset()).toBe("")

  await name.click()
  await expect(drawer).toBeVisible()
  const frameBox = await box(frame)
  const drawerBox = await box(drawer)
  expect(drawerBox.x).toBeGreaterThanOrEqual(frameBox.x - 1)
  expect(drawerBox.x + drawerBox.width).toBeLessThanOrEqual(frameBox.x + frameBox.width + 1)
  expect(drawerBox.y + drawerBox.height).toBeLessThanOrEqual(frameBox.y + frameBox.height + 1)
  expect(drawerBox.y).toBeGreaterThanOrEqual(frameBox.y)
  await expect.poll(inset).toMatch(/^\d+px$/)
  expect(Number.parseFloat(await inset())).toBeCloseTo(drawerBox.height, -1)

  const keys = drawer.getByRole("group", { name: "English keyboard" })
  await key(keys, "j").click()
  await key(keys, "o").click()
  await expect(name).toHaveValue("jo")
  await expect(name).toBeFocused()

  // Moving to another field retargets the keyboard without closing it, and the field's type picks the layout.
  await email.click()
  await expect(email).toBeFocused()
  await expect(drawer).toBeVisible()
  await expect(drawer).toHaveCount(1)
  await expect(key(drawer, "@")).toBeVisible()
  await key(drawer, "x").click()
  await expect(email).toHaveValue("x")
  await expect(name).toHaveValue("jo")
  await expect.poll(inset).toMatch(/^\d+px$/)

  await page.keyboard.press("Escape")
  await expect(drawer).toHaveCount(0)
  await expect.poll(inset).toBe("")
  await expect(email).toBeFocused()

  // The hide key closes it too, and focusing the field opens it again.
  await name.click()
  await expect(drawer).toBeVisible()
  await key(drawer, "Hide keyboard").click()
  await expect(drawer).toHaveCount(0)
  await expect.poll(inset).toBe("")
})

test("the popover keyboard opens below its search field, types, and closes on an outside press", async ({ page }) => {
  await open(page)
  const section = specimen(page, "Popover on a search field")
  await section.scrollIntoViewIfNeeded()
  const field = section.getByRole("searchbox", { name: "Search the catalogue" })
  const popover = page.locator(".fa-osk-popover")
  await expect(popover).toHaveCount(0)
  await field.click()
  await expect(popover).toBeVisible()
  await expect(popover.getByRole("group", { name: "English keyboard" })).toBeVisible()
  const fieldBox = await box(field)
  await expect.poll(async () => (await box(popover)).y).toBeGreaterThanOrEqual(fieldBox.y + fieldBox.height - 1)
  await key(popover, "d").click()
  await key(popover, "r").click()
  await expect(field).toHaveValue("dr")
  await expect(field).toBeFocused()
  // A press outside closes it.
  await page.getByRole("heading", { name: "Popover on a search field" }).click()
  await expect(popover).toHaveCount(0)
  await expect(field).toHaveValue("dr")
})

test("the catalogue page has no axe violations", async ({ page }) => {
  await open(page)
  await expect(specimen(page, "Disabled").getByRole("group", { name: "English keyboard" })).toBeVisible()
  const result = await new AxeBuilder({ page }).analyze()
  expect(result.violations, JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 1)).toEqual([])
})

test("the open drawer passes axe", async ({ page }) => {
  await open(page)
  const kiosk = specimen(page, "Kiosk sign-in")
  await kiosk.getByRole("textbox", { name: "Name" }).click()
  await expect(kiosk.locator(".fa-osk-drawer")).toBeVisible()
  const result = await new AxeBuilder({ page }).include(".gallery-osk-frame").analyze()
  expect(result.violations, JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 1)).toEqual([])
})

test("phone: the drawer fills the frame, keys are tall enough and nothing overflows @responsive", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)
  const kiosk = specimen(page, "Kiosk sign-in")
  const frame = kiosk.locator(".gallery-osk-frame")
  const drawer = frame.locator(".fa-osk-drawer")
  await frame.scrollIntoViewIfNeeded()
  await kiosk.getByRole("textbox", { name: "Name" }).click()
  await expect(drawer).toBeVisible()
  const frameBox = await box(frame)
  const drawerBox = await box(drawer)
  expect(drawerBox.width).toBeGreaterThanOrEqual(frameBox.width - 2)
  expect(drawerBox.x).toBeGreaterThanOrEqual(frameBox.x - 1)
  expect(drawerBox.x + drawerBox.width).toBeLessThanOrEqual(390)
  const heights = await drawer.locator("[data-osk-key]").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height))
  expect(heights.length).toBeGreaterThan(20)
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(24)
  const widths = await drawer.locator("[data-osk-key]").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().width))
  expect(Math.min(...widths)).toBeGreaterThanOrEqual(24)
  const overflow = await page.locator(".docs-content").evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }))
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client)

  // The TV screen scales into the column, and the other keyboards fit theirs.
  for (const title of ["TV search", "Typing into an input", "Languages", "PIN and phone", "Compact", "Sizes"]) {
    const region = specimen(page, title)
    await region.scrollIntoViewIfNeeded()
    const fits = await region.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      return [...element.querySelectorAll(".fa-osk")].every((each) => {
        const rect = each.getBoundingClientRect()
        return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1
      })
    })
    expect(fits, title).toBe(true)
  }
  const after = await page.locator(".docs-content").evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }))
  expect(after.scroll).toBeLessThanOrEqual(after.client)
})
