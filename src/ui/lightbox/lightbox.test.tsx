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
})
