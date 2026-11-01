import { describe, expect, it } from "vitest"
import { inGamut, parseHex } from "../color-picker/color.js"
import { addGradientStop, gradientColorAt, gradientStopsCss, gradientToCss, moveGradientStop, removeGradientStop, type GradientValue } from "./gradient.js"

const VALUE: GradientValue = {
  kind: "linear",
  angle: 90,
  stops: [
    { color: "#000000", position: 0 },
    { color: "#ffffff", position: 100 },
  ],
}

describe("gradientToCss", () => {
  it("writes each kind", () => {
    expect(gradientToCss(VALUE)).toBe("linear-gradient(90deg, #000000 0%, #ffffff 100%)")
    expect(gradientToCss({ ...VALUE, kind: "radial" })).toBe("radial-gradient(circle, #000000 0%, #ffffff 100%)")
    expect(gradientToCss({ ...VALUE, kind: "angular", angle: 45 })).toBe("conic-gradient(from 45deg, #000000 0%, #ffffff 100%)")
  })

  it("orders the stops by position", () => {
    expect(gradientStopsCss({ stops: [VALUE.stops[1]!, VALUE.stops[0]!] })).toBe("#000000 0%, #ffffff 100%")
  })

  it("keeps two stops at one position as a hard edge", () => {
    const stops = [
      { color: "#ff0000", position: 50 },
      { color: "#0000ff", position: 50 },
    ]
    expect(gradientStopsCss({ stops, interpolation: "oklab" })).toBe("#ff0000 50%, #0000ff 50%")
  })

  it("writes only colours sRGB can show when blending in OKLab", () => {
    const css = gradientStopsCss({ interpolation: "oklab", stops: [{ color: "#0000ff", position: 0 }, { color: "#ffff00", position: 100 }] })
    const colours = css.split(", ").map((part) => part.split(" ")[0]!)
    expect(colours).toHaveLength(10)
    for (const colour of colours) {
      expect(colour).toMatch(/^#[0-9a-f]{6}$/)
      const { l, c, h } = parseHex(colour)!
      expect(inGamut(l, c * 0.999, h)).toBe(true)
    }
    expect(css).not.toMatch(/oklch|oklab|color\(/)
  })
})

describe("gradientColorAt", () => {
  it("reads the colour between stops as the browser blends it", () => {
    expect(gradientColorAt(VALUE, 50)).toBe("#808080")
    expect(gradientColorAt(VALUE, -5)).toBe("#000000")
    expect(gradientColorAt(VALUE, 120)).toBe("#ffffff")
  })

  it("blends opacity without a dark fringe", () => {
    const stops = [
      { color: "#ff000000", position: 0 },
      { color: "#ff0000", position: 100 },
    ]
    expect(gradientColorAt({ stops }, 50)).toBe("#ff000080")
  })
})

describe("stops", () => {
  it("adds in the widest gap, in the colour already there", () => {
    const three = { ...VALUE, stops: [VALUE.stops[0]!, { color: "#000000", position: 20 }, VALUE.stops[1]!] }
    const { value, index } = addGradientStop(three)
    expect(index).toBe(2)
    expect(value.stops[2]).toEqual({ color: "#808080", position: 60 })
    expect(addGradientStop(VALUE, 25).value.stops[1]).toEqual({ color: "#404040", position: 25 })
  })

  it("keeps the order and follows the moved stop", () => {
    const three = addGradientStop(VALUE, 50).value
    const { value, index } = moveGradientStop(three, 1, 150)
    expect(value.stops.map((stop) => stop.position)).toEqual([0, 100, 100])
    expect(index).toBe(1)
    expect(moveGradientStop(three, 0, 60)).toMatchObject({ index: 1 })
  })

  it("keeps at least two stops", () => {
    expect(removeGradientStop(VALUE, 0)).toBe(VALUE)
    const three = addGradientStop(VALUE, 50).value
    expect(removeGradientStop(three, 1).stops).toEqual(VALUE.stops)
  })
})
