// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { registerMessagePack } from "../../lib/i18n/index.js"
import { LocaleProvider } from "../../lib/locale/index.js"
import de from "../../i18n/de.js"
import { inGamut } from "../color-picker/color.js"
import { ColorWheel, colorWheelColor, type ColorWheelValue } from "./index.js"
import { hueFamily, normalizeWheel, pointToWheel, wheelToPoint, wrapHue } from "./wheel.js"

beforeAll(() => {
  // jsdom has no canvas; the disc paints nothing there.
  HTMLCanvasElement.prototype.getContext = (() => null) as never
})
afterEach(cleanup)

describe("wheel geometry", () => {
  it("puts 0° to the right and turns counter-clockwise, with y down as on screen", () => {
    expect(pointToWheel(50, 0, 100, 100, 0)).toEqual({ hue: 0, amount: 50 })
    expect(pointToWheel(0, -100, 100, 100, 0).hue).toBeCloseTo(90)
    expect(pointToWheel(-100, 0, 100, 100, 0).hue).toBeCloseTo(180)
    expect(pointToWheel(0, 100, 100, 100, 0).hue).toBeCloseTo(270)
    // Past the rim clamps to max; the very centre keeps the previous hue.
    expect(pointToWheel(300, 0, 100, 1, 0).amount).toBe(1)
    expect(pointToWheel(0, 0, 100, 100, 217)).toEqual({ hue: 217, amount: 0 })
  })

  it("round-trips a value through its point", () => {
    for (const value of [{ hue: 30, amount: 40 }, { hue: 200, amount: 100 }, { hue: 359, amount: 5 }]) {
      const { x, y } = wheelToPoint(value, 100)
      const back = pointToWheel(x * 100, y * 100, 100, 100, 0)
      expect(back.hue).toBeCloseTo(value.hue, 6)
      expect(back.amount).toBeCloseTo(value.amount, 6)
    }
  })

  it("wraps hue, snaps to steps and clamps the amount", () => {
    expect(wrapHue(-10)).toBe(350)
    expect(wrapHue(360)).toBe(0)
    expect(wrapHue(725)).toBe(5)
    expect(normalizeWheel({ hue: 359.7, amount: 0.304 }, 1, 0.01, 1)).toEqual({ hue: 0, amount: 0.3 })
    expect(normalizeWheel({ hue: 12.4, amount: 140 }, 100, 1, 5)).toEqual({ hue: 10, amount: 100 })
    expect(normalizeWheel({ hue: 12, amount: -3 }, 100, 1, 1).amount).toBe(0)
  })

  it("names the sRGB primaries and secondaries by their family", () => {
    expect([29, 110, 142, 195, 264, 328].map(hueFamily)).toEqual(["red", "yellow", "green", "cyan", "blue", "magenta"])
    expect(hueFamily(55)).toBe("orange")
    expect(hueFamily(295)).toBe("purple")
  })

  it("shows every hue at the rim inside sRGB, so the disc is even", () => {
    for (let hue = 0; hue < 360; hue += 3) {
      const { l, c, h } = colorWheelColor({ hue, amount: 100 })
      expect(inGamut(l, c, h), `hue ${hue}`).toBe(true)
    }
    expect(colorWheelColor({ hue: 90, amount: 0 }).c).toBe(0)
    expect(colorWheelColor({ hue: 90, amount: 0.5 }, 1).c).toBeCloseTo(colorWheelColor({ hue: 90, amount: 100 }).c / 2)
  })
})

const sliders = () => ({ hue: screen.getByRole("slider", { name: "Hue" }), amount: screen.getByRole("slider", { name: "Amount" }) })

describe("ColorWheel", () => {
  it("is a named group of two sliders with one tab stop", () => {
    render(<ColorWheel aria-label="Shadows" defaultValue={{ hue: 142, amount: 35 }} />)
    expect(screen.getByRole("group", { name: "Shadows" })).toBeInTheDocument()
    const { hue, amount } = sliders()
    expect(hue).toHaveAttribute("aria-valuetext", "Green, 142°")
    expect(amount).toHaveAttribute("aria-valuetext", "35%")
    expect(hue).toHaveAttribute("tabindex", "0")
    expect(amount).toHaveAttribute("tabindex", "-1")
  })

  it("turns the hue with Left and Right, wrapping, and commits each key", () => {
    const change = vi.fn()
    const commit = vi.fn()
    render(<ColorWheel defaultValue={{ hue: 0, amount: 20 }} onValueChange={change} onValueCommitted={commit} />)
    const { hue } = sliders()
    hue.focus()
    fireEvent.keyDown(hue, { key: "ArrowLeft" })
    expect(commit).toHaveBeenLastCalledWith({ hue: 359, amount: 20 })
    fireEvent.keyDown(hue, { key: "ArrowRight", shiftKey: true })
    expect(commit).toHaveBeenLastCalledWith({ hue: 9, amount: 20 })
    expect(change).toHaveBeenCalledTimes(2)
    expect(hue).toHaveAttribute("aria-valuetext", "Red, 9°")
  })

  it("moves the amount with Up and Down, and focus goes to the slider that changed", () => {
    const commit = vi.fn()
    render(<ColorWheel defaultValue={{ hue: 200, amount: 0 }} onValueCommitted={commit} />)
    const { hue, amount } = sliders()
    hue.focus()
    fireEvent.keyDown(hue, { key: "ArrowUp" })
    expect(amount).toHaveFocus()
    expect(amount).toHaveAttribute("tabindex", "0")
    expect(hue).toHaveAttribute("tabindex", "-1")
    expect(commit).toHaveBeenLastCalledWith({ hue: 200, amount: 1 })
    fireEvent.keyDown(amount, { key: "PageUp" })
    expect(commit).toHaveBeenLastCalledWith({ hue: 200, amount: 11 })
    fireEvent.keyDown(amount, { key: "End" })
    expect(commit).toHaveBeenLastCalledWith({ hue: 200, amount: 100 })
    fireEvent.keyDown(amount, { key: "ArrowDown", shiftKey: true })
    expect(commit).toHaveBeenLastCalledWith({ hue: 200, amount: 90 })
    fireEvent.keyDown(amount, { key: "Home" })
    expect(commit).toHaveBeenLastCalledWith({ hue: 200, amount: 0 })
    expect(amount).toHaveAttribute("aria-valuetext", "Neutral")
    fireEvent.keyDown(amount, { key: "ArrowLeft" })
    expect(hue).toHaveFocus()
  })

  it("does not report a key that changes nothing", () => {
    const commit = vi.fn()
    render(<ColorWheel defaultValue={{ hue: 10, amount: 0 }} onValueCommitted={commit} />)
    fireEvent.keyDown(sliders().amount, { key: "ArrowDown" })
    fireEvent.keyDown(sliders().amount, { key: "Home" })
    expect(commit).not.toHaveBeenCalled()
  })

  it("returns to neutral on a double press, keeping the hue", () => {
    const commit = vi.fn()
    const { container } = render(<ColorWheel defaultValue={{ hue: 72, amount: 40 }} onValueCommitted={commit} />)
    fireEvent.doubleClick(container.querySelector(".fa-color-wheel-disc")!)
    expect(commit).toHaveBeenCalledWith({ hue: 72, amount: 0 })
  })

  it("follows a controlled value and keeps it when the host refuses a change", () => {
    function Host() {
      const [value, setValue] = useState<ColorWheelValue>({ hue: 30, amount: 10 })
      return (
        <>
          <ColorWheel value={value} onValueChange={setValue} />
          <button type="button" onClick={() => setValue({ hue: 264, amount: 50 })}>Blue</button>
        </>
      )
    }
    render(<Host />)
    fireEvent.keyDown(sliders().amount, { key: "ArrowUp" })
    expect(sliders().amount).toHaveAttribute("aria-valuetext", "11%")
    fireEvent.click(screen.getByRole("button", { name: "Blue" }))
    expect(sliders().hue).toHaveAttribute("aria-valuetext", "Blue, 264°")

    cleanup()
    render(<ColorWheel value={{ hue: 30, amount: 10 }} onValueChange={() => {}} />)
    const { amount } = sliders()
    amount.focus()
    // Twice on the same slider, so no focus move re-renders the wheel in between.
    fireEvent.keyDown(amount, { key: "ArrowUp" })
    fireEvent.keyDown(amount, { key: "ArrowUp" })
    expect(amount).toHaveAttribute("aria-valuetext", "10%")
    fireEvent.change(amount, { target: { value: "40" } })
    expect(amount).toHaveValue("10")
  })

  it("takes a screen reader's own increment of a slider", () => {
    const commit = vi.fn()
    render(<ColorWheel defaultValue={{ hue: 30, amount: 10 }} onValueCommitted={commit} />)
    fireEvent.change(sliders().amount, { target: { value: "11" } })
    expect(commit).toHaveBeenLastCalledWith({ hue: 30, amount: 11 })
  })

  it("scales the amount to max and step, and formats it", () => {
    const commit = vi.fn()
    render(<ColorWheel max={1} defaultValue={{ hue: 0, amount: 0.25 }} format={(amount) => amount.toFixed(2)} readout onValueCommitted={commit} />)
    const { amount } = sliders()
    expect(amount).toHaveAttribute("aria-valuetext", "0.25")
    fireEvent.keyDown(amount, { key: "ArrowUp" })
    expect(commit).toHaveBeenLastCalledWith({ hue: 0, amount: 0.26 })
    expect(screen.getByText("0° · 0.26")).toBeInTheDocument()
  })

  it("speaks and shows the wheel in the page's language", () => {
    registerMessagePack(de)
    const { container } = render(
      <LocaleProvider locale="de">
        <ColorWheel readout defaultValue={{ hue: 142, amount: 35 }} />
      </LocaleProvider>,
    )
    expect(screen.getByRole("group", { name: "Farbrad" })).toBeInTheDocument()
    expect(screen.getByRole("slider", { name: "Farbton" })).toHaveAttribute("aria-valuetext", "Grün, 142°")
    expect(screen.getByRole("slider", { name: "Stärke" })).toHaveAttribute("aria-valuetext", "35\u00a0%")
    expect(container.querySelector(".fa-color-wheel-readout")?.textContent?.replace(/\s/g, " ")).toBe("142° · 35 %")
  })

  it("is not operable while disabled", () => {
    const change = vi.fn()
    const { container } = render(<ColorWheel disabled defaultValue={{ hue: 10, amount: 10 }} onValueChange={change} />)
    expect(sliders().hue).toBeDisabled()
    expect(sliders().amount).toBeDisabled()
    fireEvent.doubleClick(container.querySelector(".fa-color-wheel-disc")!)
    expect(change).not.toHaveBeenCalled()
  })
})
