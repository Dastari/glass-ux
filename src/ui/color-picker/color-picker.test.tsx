// @vitest-environment jsdom
// tokens:allow-file colour values under test
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { DirectionProvider } from "../../lib/locale/direction.js"
import { ColorField, ColorPicker } from "./index.js"
import { clampToGamut, formatHex, hsvToHex, hueCusp, hueGradient, inGamut, maxChroma, parseHex, peakChroma, rgbToHsv, toRgb, vividHue } from "./color.js"

beforeAll(() => {
  // jsdom has no canvas; the area paints nothing there.
  HTMLCanvasElement.prototype.getContext = (() => null) as never
})
afterEach(cleanup)

describe("colour maths", () => {
  it("finds each hue's cusp: the sRGB primaries and secondaries are their own", () => {
    for (const hex of ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#0087ff"]) {
      const colour = parseHex(hex)!
      const cusp = hueCusp(colour.h)
      expect(cusp.l, hex).toBeCloseTo(colour.l, 3)
      expect(cusp.c, hex).toBeCloseTo(colour.c, 3)
      expect(formatHex({ ...colour, ...cusp })).toBe(hex)
    }
  })

  it("puts the cusp on the gamut's edge at every hue", () => {
    for (let h = 0; h < 360; h += 2) {
      const { l, c } = hueCusp(h)
      expect(inGamut(l, c * 0.995, h), `hue ${h}`).toBe(true)
      expect(inGamut(l, c * 1.02, h), `hue ${h}`).toBe(false)
      expect(peakChroma(h)).toBe(c)
    }
  })

  it("draws the hue track and thumb at full strength", () => {
    const red = parseHex("#ff0000")!
    const [l, c, h] = vividHue(red.h).match(/[\d.]+/g)!.map(Number)
    expect(l! / 100).toBeCloseTo(red.l, 3)
    expect(c).toBeCloseTo(red.c, 3)
    expect(h).toBeCloseTo(red.h, 1)
    expect(hueGradient().match(/oklch\(/g)).toHaveLength(37)
  })

  it("round-trips hex through OKLCH", () => {
    for (const hex of ["#000000", "#ffffff", "#1f6feb", "#e8710a", "#0f9d58", "#80808080"]) {
      const parsed = parseHex(hex)!
      expect(formatHex(parsed, true)).toBe(hex)
    }
    expect(parseHex("#abc")).toEqual(parseHex("#aabbcc"))
    expect(parseHex("nope")).toBeNull()
  })

  it("finds the gamut's edge and clamps to it", () => {
    const edge = maxChroma(0.6, 250)
    expect(inGamut(0.6, edge, 250)).toBe(true)
    expect(inGamut(0.6, edge + 0.01, 250)).toBe(false)
    expect(clampToGamut({ l: 0.6, c: 0.4, h: 250, a: 1 }).c).toBeCloseTo(edge, 4)
  })
})

describe("ColorPicker", () => {
  it("moves lightness and chroma with the keyboard and commits", () => {
    const change = vi.fn()
    const commit = vi.fn()
    render(<ColorPicker defaultValue="#808080" onValueChange={change} onValueCommit={commit} />)
    const area = screen.getByRole("slider", { name: "Lightness and chroma" })
    const before = Number(area.getAttribute("aria-valuenow"))
    fireEvent.keyDown(area, { key: "ArrowUp", shiftKey: true })
    expect(Number(area.getAttribute("aria-valuenow"))).toBe(before + 10)
    fireEvent.keyDown(area, { key: "End" })
    const last = change.mock.calls.at(-1)![0] as string
    expect(parseHex(last)!.c).toBeGreaterThan(0.05)
    expect(commit).toHaveBeenCalled()
  })

  it("commits a typed hex value and ignores text that is not a colour", () => {
    const change = vi.fn()
    render(<ColorPicker defaultValue="#1f6feb" onValueChange={change} />)
    const hex = screen.getByRole("textbox", { name: "Hex colour" })
    fireEvent.change(hex, { target: { value: "zz" } })
    fireEvent.keyDown(hex, { key: "Enter" })
    expect(change).not.toHaveBeenCalled()
    expect((hex as HTMLInputElement).value).toBe("#1f6feb")
    fireEvent.change(hex, { target: { value: "e8710a" } })
    fireEvent.keyDown(hex, { key: "Enter" })
    expect(change).toHaveBeenLastCalledWith("#e8710a")
  })

  it("chooses a swatch and marks it pressed", () => {
    const change = vi.fn()
    render(<ColorPicker defaultValue="#1f6feb" swatches={[{ value: "#0f9d58", label: "Fern" }]} onValueChange={change} />)
    const fern = screen.getByRole("button", { name: "Fern" })
    fireEvent.click(fern)
    expect(change).toHaveBeenLastCalledWith("#0f9d58")
    expect(fern.getAttribute("aria-pressed")).toBe("true")
  })
})

describe("ColorField", () => {
  it("types a colour, clears it, and submits it with a form", () => {
    const change = vi.fn()
    const { container } = render(
      <form>
        <ColorField aria-label="Tag colour" name="tag" defaultValue="#1f6feb" clearable onValueChange={change} />
      </form>,
    )
    const input = screen.getByRole("textbox", { name: "Tag colour" })
    fireEvent.change(input, { target: { value: "#0F9D58" } })
    fireEvent.blur(input)
    expect(change).toHaveBeenLastCalledWith("#0f9d58")
    expect(container.querySelector<HTMLInputElement>('input[name="tag"]')!.value).toBe("#0f9d58")
    fireEvent.change(input, { target: { value: "" } })
    fireEvent.blur(input)
    expect(change).toHaveBeenLastCalledWith(null)
  })
})

describe("right-to-left layouts", () => {
  // The bidi algorithm moves a leading "#" to the end of a hex code in an RTL page
  // ("e8875a#"), so every hex input is isolated as left-to-right.
  it("keeps the ColorField hex input left to right", () => {
    render(
      <DirectionProvider direction="rtl">
        <div dir="rtl">
          <ColorField aria-label="Tag colour" defaultValue="#e8875a" />
        </div>
      </DirectionProvider>,
    )
    const input = screen.getByRole("textbox", { name: "Tag colour" }) as HTMLInputElement
    expect(input.value).toBe("#e8875a")
    expect(input.getAttribute("dir")).toBe("ltr")
  })

  it("keeps the ColorPicker hex input and swatch labels left to right", () => {
    render(
      <DirectionProvider direction="rtl">
        <div dir="rtl">
          <ColorPicker defaultValue="#e8875a" swatches={["#0f9d58"]} />
        </div>
      </DirectionProvider>,
    )
    const hex = screen.getByRole("textbox", { name: "Hex colour" }) as HTMLInputElement
    expect(hex.value).toBe("#e8875a")
    expect(hex.getAttribute("dir")).toBe("ltr")
  })
})

describe("HSV plane", () => {
  it("round-trips HSV through RGB", () => {
    for (const hex of ["#000000", "#ffffff", "#808080", "#1f6feb", "#e8710a", "#ff0000", "#00ff00", "#0000ff"]) {
      const parsed = parseHex(hex)!
      const [r, g, b] = toRgb(parsed)
      expect(hsvToHex(rgbToHsv([r, g, b]))).toBe(formatHex(parsed))
    }
    expect(rgbToHsv([0, 255, 0])).toEqual({ h: 120, s: 1, v: 1 })
    expect(rgbToHsv([128, 128, 128], 200).h).toBe(200)
  })

  it("moves saturation and value with the keyboard and keeps the hue", () => {
    const change = vi.fn()
    const commit = vi.fn()
    render(<ColorPicker plane="hsv" defaultValue="#ff0000" onValueChange={change} onValueCommit={commit} />)
    const area = screen.getByRole("slider", { name: "Saturation and value" })
    expect(area.getAttribute("aria-valuetext")).toBe("Saturation 100%, value 100%")
    fireEvent.keyDown(area, { key: "ArrowDown", shiftKey: true })
    expect(change).toHaveBeenLastCalledWith("#e60000")
    fireEvent.keyDown(area, { key: "Home" })
    expect(change).toHaveBeenLastCalledWith("#e6e6e6")
    expect(area.getAttribute("aria-valuetext")).toBe("Saturation 0%, value 90%")
    // The hue slider keeps the red it had, though the colour is grey (e2e/color-picker-plane.spec.ts checks it: the thumb mounts once measured).
    expect(commit).toHaveBeenCalled()
  })

  it("follows a controlled value from outside and keeps the OKLCH plane by default", () => {
    const { rerender } = render(<ColorPicker plane="hsv" value="#00ff00" />)
    const area = screen.getByRole("slider", { name: "Saturation and value" })
    expect(area.getAttribute("aria-valuetext")).toBe("Saturation 100%, value 100%")
    rerender(<ColorPicker value="#00ff00" />)
    expect(screen.getByRole("slider", { name: "Lightness and chroma" })).toBeTruthy()
  })

  it("is compact with size sm", () => {
    const { container } = render(<ColorPicker size="sm" />)
    expect(container.querySelector(".fa-color-picker")!.getAttribute("data-size")).toBe("sm")
  })
})
