// tokens:allow-file colour maths
import { describe, expect, it } from "vitest"
import { BOOT_CUSTOM_COLOUR, customColourVars, hexToOklch, normalizeHex } from "./custom-colour.js"

function luminance(L: number, C: number, h: number) {
  const rad = (h * Math.PI) / 180
  const [a, b] = [C * Math.cos(rad), C * Math.sin(rad)]
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clip = (v: number) => Math.min(1, Math.max(0, v))
  return (
    0.2126 * clip(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) +
    0.7152 * clip(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) +
    0.0722 * clip(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  )
}
const ratio = (x: number, y: number) => (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)

/** A spread of colours: every 15° of hue at three lightness and saturation levels, plus greys. */
const SAMPLES: string[] = []
for (let h = 0; h < 360; h += 15)
  for (const [s, v] of [
    [1, 1],
    [0.6, 0.85],
    [0.9, 0.45],
  ]) {
    const f = (n: number) => {
      const k = (n + h / 60) % 6
      return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))))
    }
    SAMPLES.push(`#${[f(5), f(3), f(1)].map((c) => c.toString(16).padStart(2, "0")).join("")}`)
  }
SAMPLES.push("#000000", "#ffffff", "#808080", "#ffe066", "#00ffff")

describe("custom colours", () => {
  it("reads hex colours and rejects anything else", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc")
    expect(normalizeHex(" #FF6a00 ")).toBe("#ff6a00")
    expect(normalizeHex("red")).toBeNull()
    expect(normalizeHex("#12345")).toBeNull()
    expect(normalizeHex(42)).toBeNull()
    const [L, C, H] = hexToOklch("#ff0000")
    expect(L).toBeCloseTo(0.628, 3)
    expect(C).toBeCloseTo(0.2577, 3)
    expect(H).toBeCloseTo(29.23, 1)
  })

  it.each(SAMPLES)("%s as an accent keeps text on it at 4.5:1 and accent text readable on the light canvas", (hex) => {
    const vars = customColourVars({ accentColor: hex, accentColor2: null, canvasTint: null })
    const [h, c, l, fgL, h2, textMax] = ["--accent-h", "--accent-c", "--accent-l", "--accent-fg-l", "--accent-2-h", "--accent-text-max-l"].map((k) => Number(vars[k]))
    const fg = luminance(fgL!, 0.005, h!)
    expect(ratio(fg, luminance(l!, c!, h!))).toBeGreaterThanOrEqual(4.5)
    expect(ratio(fg, luminance(l!, c!, h2!))).toBeGreaterThanOrEqual(4.5)
    // themes.css: light accent text is min(accent-l − 0.05, --accent-text-max-l).
    const text = Math.min(l! - 0.05, textMax!)
    expect(ratio(luminance(text, c!, h!), luminance(0.94, 0, 0))).toBeGreaterThanOrEqual(4.5)
  })

  it("tints the neutrals and colour fields from the canvas tint's hue", () => {
    const vars = customColourVars({ accentColor: null, accentColor2: null, canvasTint: "#2d6a4f" })
    expect(Object.keys(vars)).toEqual(["--neutral-h", "--neutral-c", "--ambient-1-h", "--ambient-2-h", "--ambient-3-h"])
    expect(Number(vars["--neutral-c"])).toBeLessThanOrEqual(0.03)
    expect(customColourVars({ accentColor: null, accentColor2: "#00ff00", canvasTint: null })).toEqual({})
  })

  it("matches the boot script's copy for every sample", () => {
    const boot = new Function(`return (${BOOT_CUSTOM_COLOUR})`)() as (a: unknown, b: unknown, t: unknown) => Record<string, string>
    for (const hex of SAMPLES) {
      const second = SAMPLES[(SAMPLES.indexOf(hex) * 7) % SAMPLES.length]!
      expect(boot(hex, second, hex)).toEqual(customColourVars({ accentColor: hex, accentColor2: second, canvasTint: hex }))
    }
  })
})
