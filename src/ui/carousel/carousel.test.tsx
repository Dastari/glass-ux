// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Carousel } from "./carousel.js"

let slotWidth = 400
let reduced = false
const realRect = Element.prototype.getBoundingClientRect

beforeEach(() => {
  slotWidth = 400
  reduced = false
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: reduced && query.includes("reduce"), addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })),
  )
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const width = this.classList.contains("fa-carousel-slot") ? slotWidth : 0
    return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: 0, width, height: 0, toJSON: () => undefined } as DOMRect
  }
})
afterEach(() => {
  cleanup()
  Element.prototype.getBoundingClientRect = realRect
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.documentElement.removeAttribute("data-motion")
  document.body.innerHTML = ""
})

const three = (props: Partial<Parameters<typeof Carousel>[0]> = {}) => (
  <Carousel aria-label="Photographs" {...props}>
    <p>First</p>
    <p>Second</p>
    <p>Third</p>
  </Carousel>
)
const slide = (position: number) => document.querySelectorAll<HTMLElement>(".fa-carousel-slide")[position]!
const current = () => [...document.querySelectorAll(".fa-carousel-slide")].findIndex((element) => element.hasAttribute("data-current"))
const spoken = () => document.querySelector<HTMLElement>("[data-fa-announcer]")?.textContent ?? ""

describe("Carousel", () => {
  it("is a named carousel region of slides labelled by their place, the others inert", () => {
    render(three())
    const region = screen.getByRole("region", { name: "Photographs" })
    expect(region.getAttribute("aria-roledescription")).toBe("carousel")
    expect([...document.querySelectorAll(".fa-carousel-slide")].map((element) => element.getAttribute("aria-label"))).toEqual(["1 of 3", "2 of 3", "3 of 3"])
    expect(document.querySelectorAll(".fa-carousel-slide")[0]!.getAttribute("aria-roledescription")).toBe("slide")
    expect([...document.querySelectorAll(".fa-carousel-slide")].map((element) => element.hasAttribute("inert"))).toEqual([false, true, true])
  })

  it("keeps a control in a hidden slide out of reach", () => {
    render(
      <Carousel aria-label="Actions">
        <button type="button">First action</button>
        <button type="button">Second action</button>
      </Carousel>,
    )
    expect(slide(1).hasAttribute("inert")).toBe(true)
    expect(slide(1).querySelector("button")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }))
    expect(slide(0).hasAttribute("inert")).toBe(true)
    expect(slide(1).hasAttribute("inert")).toBe(false)
  })

  it("moves with Previous and Next, which stop at the ends and say why", () => {
    const onIndexChange = vi.fn()
    render(three({ onIndexChange }))
    const previous = screen.getByRole("button", { name: "Previous slide" })
    const next = screen.getByRole("button", { name: "Next slide" })
    expect(previous.getAttribute("aria-disabled")).toBe("true")
    fireEvent.click(next)
    fireEvent.click(next)
    expect(onIndexChange.mock.calls).toEqual([[1], [2]])
    expect(current()).toBe(2)
    expect(next.getAttribute("aria-disabled")).toBe("true")
    fireEvent.click(next)
    expect(onIndexChange).toHaveBeenCalledTimes(2)
  })

  it("wraps with loop", () => {
    render(three({ loop: true }))
    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }))
    expect(current()).toBe(2)
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }))
    expect(current()).toBe(0)
  })

  it("is controlled when given an index", () => {
    const onIndexChange = vi.fn()
    const { rerender } = render(three({ index: 1, onIndexChange }))
    expect(current()).toBe(1)
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }))
    expect(onIndexChange).toHaveBeenLastCalledWith(2)
    expect(current()).toBe(1)
    rerender(three({ index: 2, onIndexChange }))
    expect(current()).toBe(2)
  })

  it("shows indicators as one tab stop and moves with the arrow keys, Home and End", () => {
    render(three())
    const tabs = screen.getAllByRole("tab")
    expect(screen.getByRole("tablist", { name: "Slides" })).toBeTruthy()
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1])
    expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual(["Go to slide 1 of 3", "Go to slide 2 of 3", "Go to slide 3 of 3"])
    expect(slide(0).getAttribute("role")).toBe("tabpanel")
    fireEvent.keyDown(tabs[0]!, { key: "ArrowRight" })
    expect(current()).toBe(1)
    expect(document.activeElement).toBe(tabs[1])
    fireEvent.keyDown(tabs[1]!, { key: "End" })
    expect(current()).toBe(2)
    fireEvent.keyDown(tabs[2]!, { key: "ArrowRight" })
    expect(current()).toBe(2)
    fireEvent.keyDown(tabs[2]!, { key: "Home" })
    expect(current()).toBe(0)
  })

  it("reads the arrow keys by the reading direction", () => {
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        {three()}
      </div>,
    )
    const tabs = screen.getAllByRole("tab")
    fireEvent.keyDown(tabs[0]!, { key: "ArrowLeft" })
    expect(current()).toBe(1)
    fireEvent.keyDown(tabs[1]!, { key: "ArrowRight" })
    expect(current()).toBe(0)
  })

  it("names the indicators after the slides when it can", () => {
    render(three({ slideNames: ["Dusk", "Dawn", "Noon"] }))
    expect(screen.getAllByRole("tab").map((tab) => tab.getAttribute("aria-label"))).toEqual(["Dusk", "Dawn", "Noon"])
  })

  it("shows the count instead when the indicators do not fit, and then the slides are groups", () => {
    slotWidth = 60
    render(three())
    expect(screen.queryAllByRole("tab")).toHaveLength(0)
    expect(document.querySelector(".fa-carousel-count")!.textContent).toBe("1 of 3")
    expect(slide(0).getAttribute("role")).toBe("group")
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }))
    expect(document.querySelector(".fa-carousel-count")!.textContent).toBe("2 of 3")
  })

  it("announces a change the person makes, politely, and a change autoplay makes not at all", () => {
    vi.useFakeTimers()
    render(three({ slideNames: ["Dusk", "Dawn", "Noon"], autoplay: 3000 }))
    act(() => void fireEvent.click(screen.getByRole("button", { name: "Next slide" })))
    act(() => void vi.advanceTimersByTime(300))
    expect(spoken()).toBe("Slide 2 of 3: Dawn")
    // Leave the carousel, so autoplay is not held.
    act(() => void fireEvent.blur(screen.getByRole("button", { name: "Next slide" }), { relatedTarget: document.body }))
    act(() => void vi.advanceTimersByTime(3000))
    expect(current()).toBe(2)
    act(() => void vi.advanceTimersByTime(300))
    expect(spoken()).toBe("Slide 2 of 3: Dawn")
  })

  it("follows a swipe: where the strip comes to rest is the slide shown", () => {
    vi.useFakeTimers()
    const onIndexChange = vi.fn()
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, get: () => 900 })
    try {
      render(three({ onIndexChange }))
      const strip = document.querySelector<HTMLElement>(".fa-carousel-viewport")!
      strip.scrollLeft = 600
      act(() => void fireEvent.scroll(strip))
      expect(onIndexChange).not.toHaveBeenCalled()
      act(() => void vi.advanceTimersByTime(150))
      expect(onIndexChange).toHaveBeenCalledWith(2)
      expect(current()).toBe(2)
    } finally {
      delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth
    }
  })

  it("reserves the shape the host gives it", () => {
    render(three({ ratio: "16 / 9" }))
    expect(document.querySelector<HTMLElement>(".fa-carousel")!.style.getPropertyValue("--_ratio")).toBe("16 / 9")
    expect(document.querySelector(".fa-carousel-viewport")!.hasAttribute("data-fixed")).toBe(true)
  })

  it("renders no controls for a single slide", () => {
    render(
      <Carousel aria-label="One">
        <p>Only</p>
      </Carousel>,
    )
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryAllByRole("tab")).toHaveLength(0)
  })

  describe("autoplay", () => {
    beforeEach(() => vi.useFakeTimers())
    const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

    it("advances on its interval, cycling, and the person can stop it", () => {
      render(three({ autoplay: 2000 }))
      tick(2000)
      expect(current()).toBe(1)
      tick(2000)
      expect(current()).toBe(2)
      tick(2000)
      expect(current()).toBe(0)
      fireEvent.click(screen.getByRole("button", { name: "Pause automatic advance" }))
      // Leaving the carousel does not restart what the person stopped.
      act(() => void fireEvent.pointerLeave(document.querySelector(".fa-carousel")!))
      act(() => void fireEvent.blur(screen.getByRole("button", { name: "Start automatic advance" }), { relatedTarget: document.body }))
      tick(10_000)
      expect(current()).toBe(0)
      fireEvent.click(screen.getByRole("button", { name: "Start automatic advance" }))
      act(() => void fireEvent.blur(screen.getByRole("button", { name: "Pause automatic advance" }), { relatedTarget: document.body }))
      tick(2000)
      expect(current()).toBe(1)
    })

    it("holds while the pointer is over it", () => {
      render(three({ autoplay: 2000 }))
      const root = document.querySelector(".fa-carousel")!
      act(() => void fireEvent.pointerEnter(root, { pointerType: "mouse" }))
      tick(6000)
      expect(current()).toBe(0)
      act(() => void fireEvent.pointerLeave(root, { pointerType: "mouse" }))
      tick(2000)
      expect(current()).toBe(1)
    })

    it("holds while focus is inside it", () => {
      render(three({ autoplay: 2000 }))
      const next = screen.getByRole("button", { name: "Next slide" })
      act(() => void fireEvent.focus(next))
      tick(6000)
      expect(current()).toBe(0)
      act(() => void fireEvent.blur(next, { relatedTarget: document.body }))
      tick(2000)
      expect(current()).toBe(1)
    })

    it("holds while the document is hidden", () => {
      render(three({ autoplay: 2000 }))
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true })
      act(() => void document.dispatchEvent(new Event("visibilitychange")))
      tick(6000)
      expect(current()).toBe(0)
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false })
      act(() => void document.dispatchEvent(new Event("visibilitychange")))
      tick(2000)
      expect(current()).toBe(1)
    })

    it("never starts under reduced motion, and then has nothing to stop", () => {
      document.documentElement.setAttribute("data-motion", "reduced")
      render(three({ autoplay: 1000 }))
      tick(5000)
      expect(current()).toBe(0)
      expect(screen.queryByRole("button", { name: /automatic advance/ })).toBeNull()
    })

    it("reports and can be controlled by its playing state", () => {
      const onPlayingChange = vi.fn()
      render(three({ autoplay: 2000, playing: false, onPlayingChange }))
      tick(6000)
      expect(current()).toBe(0)
      fireEvent.click(screen.getByRole("button", { name: "Start automatic advance" }))
      expect(onPlayingChange).toHaveBeenCalledWith(true)
    })
  })
})
