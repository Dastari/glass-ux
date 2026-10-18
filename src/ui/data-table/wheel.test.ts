import { describe, expect, it, vi } from "vitest"
import { forwardWheel } from "./wheel.js"

function scroller(box: Partial<Record<"scrollTop" | "scrollHeight" | "clientHeight" | "scrollLeft" | "scrollWidth" | "clientWidth", number>>, direction = "ltr") {
  const scrollBy = vi.fn()
  const element = {
    scrollTop: 0,
    scrollHeight: 1000,
    clientHeight: 400,
    scrollLeft: 0,
    scrollWidth: 800,
    clientWidth: 800,
    ...box,
    scrollBy,
    ownerDocument: { defaultView: { getComputedStyle: () => ({ direction }) } },
  }
  return { element: element as unknown as HTMLElement, scrollBy }
}

const wheel = (deltaY: number, deltaX = 0, deltaMode = 0, ctrlKey = false) => ({ deltaX, deltaY, deltaMode, ctrlKey })

describe("forwardWheel", () => {
  it("scrolls the rows by a header wheel while they can move", () => {
    const { element, scrollBy } = scroller({})
    expect(forwardWheel(element, wheel(120))).toBe(true)
    expect(scrollBy).toHaveBeenCalledWith({ top: 120, left: 0 })
  })

  it("leaves the wheel to the page at the ends and in rows that fit", () => {
    expect(forwardWheel(scroller({}).element, wheel(-120))).toBe(false)
    expect(forwardWheel(scroller({ scrollTop: 600 }).element, wheel(120))).toBe(false)
    expect(forwardWheel(scroller({ scrollHeight: 400 }).element, wheel(120))).toBe(false)
  })

  it("converts line and page deltas", () => {
    const lines = scroller({})
    forwardWheel(lines.element, wheel(3, 0, 1))
    expect(lines.scrollBy).toHaveBeenCalledWith({ top: 60, left: 0 })
    const pages = scroller({})
    forwardWheel(pages.element, wheel(1, 0, 2))
    expect(pages.scrollBy).toHaveBeenCalledWith({ top: 400, left: 0 })
  })

  it("takes horizontal wheels in both directions of writing", () => {
    const wide = scroller({ scrollWidth: 1600 })
    expect(forwardWheel(wide.element, wheel(0, 100))).toBe(true)
    expect(wide.scrollBy).toHaveBeenCalledWith({ top: 0, left: 100 })
    expect(forwardWheel(scroller({ scrollWidth: 1600 }).element, wheel(0, -100))).toBe(false)
    // Right to left: the start is scrollLeft 0 and the end lies at negative offsets.
    expect(forwardWheel(scroller({ scrollWidth: 1600 }, "rtl").element, wheel(0, -100))).toBe(true)
    expect(forwardWheel(scroller({ scrollWidth: 1600 }, "rtl").element, wheel(0, 100))).toBe(false)
  })

  it("leaves Ctrl + wheel to the browser's zoom", () => {
    expect(forwardWheel(scroller({}).element, wheel(120, 0, 0, true))).toBe(false)
  })
})
