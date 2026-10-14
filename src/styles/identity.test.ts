/**
 * tokens:allow-file colour maths
 *
 * The identity colours (--identity-1 … --identity-8 in identity.css, from each palette's
 * --chart-h in themes.css) are computed, so they are validated by computation, never by eye.
 * For every palette in both modes:
 *
 *   initials   --fg on every tile ≥ 4.5:1 (R20.1, text)
 *   distinct   every pair of tiles ΔE ≥ 6 (OKLab × 100), so two organisations side by side
 *              never look alike
 *   data       slot N is ≥ 30° from chart slot N, so an avatar never wears the hue of the
 *              series beside it
 *   status     slots 1–5 are ≥ 25° from every status hue (danger, warning, success); no slot
 *              is within 25° of danger, and none within 15° of any status hue
 *
 * A custom --chart-h (any hue round the wheel) must keep initials legible and tiles distinct.
 * The formulas are parsed from the CSS, so a change there is tested here.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const identity = readFileSync(join(__dirname, "identity.css"), "utf8")
const data = readFileSync(join(__dirname, "data.css"), "utf8")
const themes = readFileSync(join(__dirname, "themes.css"), "utf8")

type Rgb = [number, number, number]
type Mode = "light" | "dark"
const MODES: Mode[] = ["light", "dark"]

function oklchToLinear(L: number, C: number, h: number): Rgb {
  const rad = (h * Math.PI) / 180
  const a = C * Math.cos(rad)
  const b = C * Math.sin(rad)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return lin.map((v) => Math.min(1, Math.max(0, v))) as Rgb
}
function linearToOklab([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}
const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b
function contrast(a: Rgb, b: Rgb) {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
function deltaE(a: Rgb, b: Rgb) {
  const [p, q] = [linearToOklab(a), linearToOklab(b)]
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
}
const hueDistance = (a: number, b: number) => {
  const d = (((a - b) % 360) + 360) % 360
  return Math.min(d, 360 - d)
}

// ── Parse the token files ──────────────────────────────────────────────────────────────

const num = (source: string, name: string) => {
  const match = source.match(new RegExp(`--${name}:\\s*([\\d.]+)`))
  if (!match) throw new Error(`--${name} not found`)
  return Number(match[1])
}
const block = (source: string, selector: string) => {
  const start = source.indexOf(selector)
  if (start < 0) throw new Error(`${selector} not found`)
  return source.slice(start, source.indexOf("}", start))
}

const modeBlock = { light: block(identity, '[data-mode="light"] {'), dark: block(identity, '[data-mode="dark"] {') }
const TILE: Record<Mode, { a: number; b: number; c: number }> = {
  light: { a: num(modeBlock.light, "identity-l-a"), b: num(modeBlock.light, "identity-l-b"), c: num(modeBlock.light, "identity-c") },
  dark: { a: num(modeBlock.dark, "identity-l-a"), b: num(modeBlock.dark, "identity-l-b"), c: num(modeBlock.dark, "identity-c") },
}
const SLOTS = Array.from({ length: 8 }, (_, i) => {
  const slot = i + 1
  const match = identity.match(
    new RegExp(`--identity-${slot}: oklch\\(var\\(--identity-l-([ab])\\) var\\(--identity-c\\) calc\\(var\\(--chart-h\\) \\+ var\\(--identity-offset-${slot}\\)\\)\\)`)
  )
  if (!match) throw new Error(`--identity-${slot} does not follow the slot formula`)
  return { tier: match[1] as "a" | "b", offset: num(identity, `identity-offset-${slot}`) }
})
/** Chart slot offsets from --chart-h: slot 1 is the hue itself. */
const CHART_OFFSETS = [0, ...Array.from({ length: 7 }, (_, i) => num(data, `chart-offset-${i + 2}`))]

const PALETTES: Record<string, { chartH: number; neutral: number }> = {}
for (const match of themes.matchAll(/\[data-palette="([\w-]+)"\]\s*\{([^}]*)\}/g)) {
  const [, name = "", body = ""] = match
  if (PALETTES[name] || !/--chart-h:/.test(body)) continue
  PALETTES[name] = { chartH: num(body, "chart-h"), neutral: num(body, "neutral-h") }
}

/** A literal oklch(L C h) role in a mode block of themes.css, e.g. --fg or --danger. */
function role(mode: Mode, name: string) {
  const split = themes.split('@scope ([data-mode="dark"])')
  const scope = mode === "light" ? (split[0] ?? "") : (split[1] ?? "")
  const match = scope.match(new RegExp(`--${name}:\\s*oklch\\(([\\d.]+) ([\\d.]+) (var\\(--[\\w-]+\\)|[\\d.]+)\\)`))
  if (!match) throw new Error(`--${name} (${mode}) not found`)
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) }
}
const STATUS = Object.fromEntries(MODES.map((mode) => [mode, ["danger", "warning", "success"].map((name) => ({ name, h: role(mode, name).h }))])) as Record<
  Mode,
  Array<{ name: string; h: number }>
>

const tile = (mode: Mode, chartH: number, slot: number) => {
  const { tier, offset } = SLOTS[slot]!
  return oklchToLinear(TILE[mode][tier], TILE[mode].c, chartH + offset)
}
const ink = (mode: Mode, neutral: number) => {
  const fg = role(mode, "fg")
  return oklchToLinear(fg.l, fg.c, neutral)
}

describe("identity colours", () => {
  it("parses eight slots and every palette", () => {
    expect(SLOTS).toHaveLength(8)
    expect(Object.keys(PALETTES).length).toBeGreaterThanOrEqual(5)
  })

  it("keeps initials legible on every tile (≥ 4.5:1)", () => {
    const failures: string[] = []
    for (const [name, palette] of Object.entries(PALETTES)) {
      for (const mode of MODES) {
        for (let slot = 0; slot < 8; slot++) {
          const ratio = contrast(tile(mode, palette.chartH, slot), ink(mode, palette.neutral))
          if (ratio < 4.5) failures.push(`${name} ${mode} slot ${slot + 1}: ${ratio.toFixed(2)}`)
        }
      }
    }
    expect(failures).toEqual([])
  })

  it("keeps every pair of tiles apart (ΔE ≥ 6)", () => {
    const failures: string[] = []
    for (const [name, palette] of Object.entries(PALETTES)) {
      for (const mode of MODES) {
        for (let a = 0; a < 8; a++) {
          for (let b = a + 1; b < 8; b++) {
            const d = deltaE(tile(mode, palette.chartH, a), tile(mode, palette.chartH, b))
            if (d < 6) failures.push(`${name} ${mode} slots ${a + 1}/${b + 1}: ΔE ${d.toFixed(1)}`)
          }
        }
      }
    }
    expect(failures).toEqual([])
  })

  it("never wears the hue of the chart series in the same slot (≥ 30°)", () => {
    // Both derive from --chart-h, so the gap is the same for every palette.
    for (let slot = 0; slot < 8; slot++) {
      expect(hueDistance(SLOTS[slot]!.offset, CHART_OFFSETS[slot]!), `slot ${slot + 1}`).toBeGreaterThanOrEqual(30)
    }
  })

  it("keeps clear of the status hues: slots 1–5 by 25°, every slot clear of danger", () => {
    const failures: string[] = []
    for (const [name, palette] of Object.entries(PALETTES)) {
      for (const mode of MODES) {
        for (let slot = 0; slot < 8; slot++) {
          const hue = palette.chartH + SLOTS[slot]!.offset
          for (const status of STATUS[mode]) {
            const d = hueDistance(hue, status.h)
            const floor = slot < 5 || status.name === "danger" ? 25 : 15
            if (d < floor) failures.push(`${name} ${mode} slot ${slot + 1} is ${d}° from ${status.name}`)
          }
        }
      }
    }
    expect(failures).toEqual([])
  })

  it("keeps initials legible and tiles distinct for any data hue round the wheel", () => {
    const failures: string[] = []
    for (let chartH = 0; chartH < 360; chartH += 15) {
      for (const mode of MODES) {
        const tiles = Array.from({ length: 8 }, (_, slot) => tile(mode, chartH, slot))
        for (const [slot, colour] of tiles.entries()) {
          const ratio = contrast(colour, ink(mode, 270))
          if (ratio < 4.5) failures.push(`h ${chartH} ${mode} slot ${slot + 1}: ${ratio.toFixed(2)}`)
        }
        for (let a = 0; a < 8; a++) {
          for (let b = a + 1; b < 8; b++) {
            const d = deltaE(tiles[a]!, tiles[b]!)
            if (d < 5) failures.push(`h ${chartH} ${mode} slots ${a + 1}/${b + 1}: ΔE ${d.toFixed(1)}`)
          }
        }
      }
    }
    expect(failures).toEqual([])
  })
})
