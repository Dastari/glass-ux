// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Lightbox } from "./index.js"

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const IMAGES = [
  { src: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", alt: "First", width: 1600, height: 1000 },
  { src: "data:image/gif;base64,R0lGODlhAQABAAAAACx=", alt: "Second", width: 800, height: 600 },
]

describe("Lightbox", () => {
  it("moves with the arrow keys, zooms with + and fits with 0", async () => {
    const change = vi.fn()
    render(<Lightbox images={IMAGES} defaultOpen onIndexChange={change} />)
    expect(await screen.findByRole("region", { name: "First" })).toBeTruthy()
    expect(screen.getByText("1 of 2 · 1,600 × 1,000")).toBeTruthy()
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowRight" })
    })
    expect(change).toHaveBeenLastCalledWith(1)
    expect(screen.getByRole("region", { name: "Second" })).toBeTruthy()
    act(() => {
      fireEvent.keyDown(window, { key: "+" })
    })
    expect(screen.getByText("150%")).toBeTruthy()
    act(() => {
      fireEvent.keyDown(window, { key: "0" })
    })
    expect(screen.getByText("Fit")).toBeTruthy()
  })

  it("leaves the arrow keys to the zoomed stage when it can scroll, and keeps the buttons", async () => {
    const change = vi.fn()
    render(<Lightbox images={IMAGES} defaultOpen onIndexChange={change} />)
    const stage = await screen.findByRole("region", { name: "First" })
    // jsdom has no layout: say the zoomed stage is wider than its box.
    Object.defineProperty(stage, "scrollWidth", { configurable: true, value: 2400 })
    Object.defineProperty(stage, "clientWidth", { configurable: true, value: 800 })
    act(() => {
      fireEvent.keyDown(window, { key: "+" })
    })
    stage.focus()
    act(() => {
      fireEvent.keyDown(stage, { key: "ArrowRight" })
    })
    expect(change).not.toHaveBeenCalled()
    // Fitted again, or focus elsewhere in the dialog, the arrows change picture.
    act(() => {
      fireEvent.keyDown(window, { key: "0" })
    })
    act(() => {
      fireEvent.keyDown(stage, { key: "ArrowRight" })
    })
    expect(change).toHaveBeenLastCalledWith(1)
    fireEvent.click(screen.getByRole("button", { name: "Next image" }))
    expect(change).toHaveBeenCalledTimes(2)
  })

  it("announces the position and name of the picture when it changes, not when it opens", async () => {
    render(<Lightbox images={IMAGES} defaultOpen />)
    await screen.findByRole("region", { name: "First" })
    const live = () => document.querySelector('[aria-live="polite"][aria-atomic="true"]')
    expect(live()?.textContent).toBe("")
    fireEvent.click(screen.getByRole("button", { name: "Next image" }))
    expect(live()?.textContent).toBe("Image 2 of 2: Second")
  })
})
