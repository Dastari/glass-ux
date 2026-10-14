/**
 * tokens:allow-file colour maths
 *
 * The data colours (--chart-1 … --chart-8 in data.css, from each palette's --chart-h in
 * themes.css) are computed, so they are validated by computation, never by eye. For every
 * palette in both modes:
 *
 *   status     slot 1 is never within 25° of a status hue (danger, warning, success); nor are
 *              slots 2 and 3. A later slot within 25° of one differs from it by ≥ 0.1 lightness.
 *              No data hue is the brand accent of a palette whose accent is a status colour.
 *   contrast   every slot ≥ 3:1 against the panel glass (glass-fill-panel over the canvas) and
 *              against Solid (surface-2) — R20.1 for UI boundaries
 *   normal     neighbouring slots ΔE ≥ 15 (OKLab × 100) with full colour vision
 *   CVD        neighbouring slots ΔE ≥ 8 under protanopia and deuteranopia
 *              (Machado, Oliveira & Fernandes 2009, severity 1)
 *
 * A custom --chart-h (any hue round the wheel) must keep contrast and the normal-vision floor.
 * The formulas are parsed from the CSS, so a change there is tested here.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const data = readFileSync(join(__dirname, "data.css"), "utf8")
const themes = readFileSync(join(__dirname, "themes.css"), "utf8")
const glass = readFileSync(join(__dirname, "glass.css"), "utf8")

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
const encode = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
const decode = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
/** Alpha-composite in gamma-encoded sRGB, as the browser paints a translucent fill. */
const over = (top: Rgb, alpha: number, under: Rgb): Rgb =>
  top.map((v, i) => decode(encode(v) * alpha + encode(under[i]!) * (1 - alpha))) as Rgb
const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b
function contrast(a: Rgb, b: Rgb) {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
const MACHADO = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
} as const
const simulate = (rgb: Rgb, kind: keyof typeof MACHADO): Rgb =>
  MACHADO[kind].map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]))) as Rgb
function deltaE(a: Rgb, b: Rgb) {
  const [x, y] = [linearToOklab(a), linearToOklab(b)]
  return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}
const cvdDelta = (a: Rgb, b: Rgb) => Math.min(deltaE(simulate(a, "protan"), simulate(b, "protan")), deltaE(simulate(a, "deutan"), simulate(b, "deutan")))
/** Shortest distance between two hues, in degrees. */
const hueDistance = (a: number, b: number) => {
  const d = Math.abs((((a - b) % 360) + 360) % 360)
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

const modeBlock = { light: block(data, '[data-mode="light"] {'), dark: block(data, '[data-mode="dark"] {') }
const CHROMA = num(data, "chart-c")
const SLOT1: Record<Mode, { l: number; c: number }> = {
  light: { l: num(modeBlock.light, "chart-1-l"), c: num(modeBlock.light, "chart-1-c") },
  dark: { l: num(modeBlock.dark, "chart-1-l"), c: num(modeBlock.dark, "chart-1-c") },
}
const TIERS: Record<Mode, Record<"a" | "b", number>> = {
  light: { a: num(modeBlock.light, "chart-l-a"), b: num(modeBlock.light, "chart-l-b") },
  dark: { a: num(modeBlock.dark, "chart-l-a"), b: num(modeBlock.dark, "chart-l-b") },
}
if (!/--chart-1: oklch\(var\(--chart-1-l\) var\(--chart-1-c\) var\(--chart-h\)\)/.test(data)) throw new Error("--chart-1 does not follow its formula")
/** Slot formulas: [tier, offset] for slots 2–8, read from the declarations themselves. */
const SLOTS = Array.from({ length: 7 }, (_, i) => {
  const slot = i + 2
  const match = data.match(new RegExp(`--chart-${slot}: oklch\\(var\\(--chart-l-([ab])\\) var\\(--chart-c\\) calc\\(var\\(--chart-h\\) \\+ var\\(--chart-offset-${slot}\\)\\)\\)`))
  if (!match) throw new Error(`--chart-${slot} does not follow the slot formula`)
  return { tier: match[1] as "a" | "b", offset: num(data, `chart-offset-${slot}`) }
})

interface PaletteParams {
  chartH: number
  accentH: number
  neutral: number
}
const PALETTES: Record<string, PaletteParams> = {}
for (const match of themes.matchAll(/\[data-palette="([\w-]+)"\]\s*\{([^}]*)\}/g)) {
  const [, name = "", body = ""] = match
  if (PALETTES[name]) continue
  PALETTES[name] = { chartH: num(body, "chart-h"), accentH: num(body, "accent-h"), neutral: num(body, "neutral-h") }
}

/** The literal lightness/chroma/hue of a role in a mode block, e.g. --canvas: oklch(0.972 0.008 …). */
function role(source: string, mode: Mode, name: string): { l: number; c: number; h: number; alpha?: number } {
  const split = source.split('[data-mode="dark"]')
  const scope = mode === "light" ? split[0] ?? "" : split.slice(1).join('[data-mode="dark"]')
  const match = scope.match(new RegExp(`--${name}:\\s*oklch\\(([\\d.]+) ([\\d.]+) (var\\(--[\\w-]+\\)|[\\d.]+)\\s*(?:/ ([\\d.]+))?\\)`))
  if (!match) throw new Error(`--${name} (${mode}) not found`)
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]), alpha: match[4] ? Number(match[4]) : undefined }
}

/** The status colours a data hue must stay clear of: hue and lightness per mode. */
const STATUS: Record<Mode, Array<{ name: string; h: number; l: number }>> = {
  light: ["danger", "warning", "success"].map((name) => ({ name, ...role(themes, "light", name) })),
  dark: ["danger", "warning", "success"].map((name) => ({ name, ...role(themes, "dark", name) })),
}
const STATUS_BAND = 25

function surfaces(mode: Mode, neutral: number): Record<string, Rgb> {
  const canvas = role(themes, mode, "canvas")
  const fill = role(glass, mode, "glass-fill-panel")
  const solid = role(glass, mode, "surface-2")
  const under = oklchToLinear(canvas.l, canvas.c, neutral)
  return {
    "panel glass": over(oklchToLinear(fill.l, fill.c, neutral), fill.alpha ?? 1, under),
    solid: oklchToLinear(solid.l, solid.c, neutral),
  }
}

/** Every slot's hue, lightness and chroma for a chart hue in a mode. */
function slots(mode: Mode, chartH: number) {
  return [
    { h: chartH, l: SLOT1[mode].l, c: SLOT1[mode].c },
    ...SLOTS.map(({ tier, offset }) => ({ h: (chartH + offset) % 360, l: TIERS[mode][tier], c: CHROMA })),
  ]
}
const colours = (mode: Mode, chartH: number) => slots(mode, chartH).map((s) => oklchToLinear(s.l, s.c, s.h))

// ── The checks ─────────────────────────────────────────────────────────────────────────

describe("data colours", () => {
  it("parses every palette's chart hue, all eight slots and the status hues", () => {
    expect(Object.keys(PALETTES)).toEqual(["ocean", "aurora", "emerald", "sunset", "graphite", "ruby"])
    expect(SLOTS).toHaveLength(7)
    expect(new Set(SLOTS.map((s) => s.offset)).size).toBe(7)
    expect(STATUS.light.map((s) => s.name)).toEqual(["danger", "warning", "success"])
    expect(STATUS.dark.every((s) => Number.isFinite(s.h))).toBe(true)
  })

  for (const [name, p] of Object.entries(PALETTES)) {
    it(`${name}: slot 1 is never within the status-hue bands`, () => {
      for (const mode of MODES) {
        for (const status of STATUS[mode]) {
          expect(hueDistance(p.chartH, status.h), `${mode} ${status.name}`).toBeGreaterThanOrEqual(STATUS_BAND)
        }
      }
    })

    it(`${name}: data never borrows a status-coloured accent`, () => {
      const statusAccent = STATUS.light.some((status) => hueDistance(p.accentH, status.h) < STATUS_BAND)
      if (statusAccent) expect(hueDistance(p.chartH, p.accentH), "chart hue vs a status-coloured accent").toBeGreaterThanOrEqual(STATUS_BAND)
    })

    for (const mode of MODES) {
      it(`${name} ${mode}: slots 2–3 clear the status bands; later slots only with a lightness step`, () => {
        slots(mode, p.chartH).forEach((slot, index) => {
          for (const status of STATUS[mode]) {
            if (hueDistance(slot.h, status.h) >= STATUS_BAND) continue
            expect(index + 1, `slot ${index + 1} sits in the ${status.name} band`).toBeGreaterThan(3)
            expect(Math.abs(slot.l - status.l), `slot ${index + 1} vs ${status.name} lightness`).toBeGreaterThanOrEqual(0.1)
          }
        })
      })

      it(`${name} ${mode}: every slot ≥ 3:1 on the panel glass and on Solid`, () => {
        for (const [surface, rgb] of Object.entries(surfaces(mode, p.neutral))) {
          colours(mode, p.chartH).forEach((colour, index) => {
            expect(contrast(colour, rgb), `slot ${index + 1} on ${surface}`).toBeGreaterThanOrEqual(3)
          })
        }
      })

      it(`${name} ${mode}: neighbours are distinct (normal ΔE ≥ 15, CVD ΔE ≥ 8)`, () => {
        const list = colours(mode, p.chartH)
        for (let index = 0; index < list.length - 1; index++) {
          const [a, b] = [list[index]!, list[index + 1]!]
          expect(deltaE(a, b), `slots ${index + 1}–${index + 2}`).toBeGreaterThanOrEqual(15)
          expect(cvdDelta(a, b), `slots ${index + 1}–${index + 2} (protan/deutan)`).toBeGreaterThanOrEqual(8)
        }
      })
    }
  }

  it("any custom --chart-h keeps 3:1 and the normal-vision floor", () => {
    const neutrals = new Set(Object.values(PALETTES).map((p) => p.neutral))
    for (let hue = 0; hue < 360; hue += 15) {
      for (const mode of MODES) {
        const list = colours(mode, hue)
        for (const neutral of neutrals) {
          for (const rgb of Object.values(surfaces(mode, neutral))) {
            list.forEach((colour, index) => {
              expect(contrast(colour, rgb), `--chart-h ${hue} ${mode} slot ${index + 1}`).toBeGreaterThanOrEqual(3)
            })
          }
        }
        for (let index = 0; index < list.length - 1; index++) {
          expect(deltaE(list[index]!, list[index + 1]!), `--chart-h ${hue} ${mode} slots ${index + 1}–${index + 2}`).toBeGreaterThanOrEqual(15)
        }
      }
    }
  })
})
