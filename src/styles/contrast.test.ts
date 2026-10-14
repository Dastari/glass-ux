/**
 * tokens:allow-file colour maths
 *
 * R20.1 for every palette in both modes: text on solid fills (primary, danger, success,
 * info, warning buttons and badges) must reach 4.5:1. Palette parameters are parsed from
 * themes.css, and the role formulas are mirrored here; if a formula changes in CSS, this
 * test must change with it.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const css = readFileSync(join(__dirname, "themes.css"), "utf8")

function oklchToRgb(L: number, C: number, h: number): [number, number, number] {
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
  return lin.map((v) => Math.min(1, Math.max(0, v))) as [number, number, number]
}

const luminance = ([r, g, b]: [number, number, number]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
function contrast(a: [number, number, number], b: [number, number, number]) {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** Palette blocks: [data-palette="x"] { --accent-h: …; } */
function palettes() {
  const result: Record<string, Record<string, number>> = {}
  for (const match of css.matchAll(/\[data-palette="([\w-]+)"\]\s*\{([^}]*)\}/g)) {
    const [, name = "", body = ""] = match
    if (result[name]) continue
    const values: Record<string, number> = {}
    for (const decl of body.matchAll(/--([\w-]+):\s*([\d.]+);/g)) values[decl[1] ?? ""] = Number(decl[2])
    result[name] = values
  }
  return result
}

/** A literal oklch(L C h) role inside a mode block, e.g. --danger in [data-mode="dark"]. */
function literalRole(mode: "light" | "dark", role: string): [number, number, number] {
  const block = mode === "light" ? css.split('@scope ([data-mode="dark"])')[0] ?? "" : css.split('@scope ([data-mode="dark"])')[1] ?? ""
  const match = block.match(new RegExp(`--${role}:\\s*oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`))
  if (!match) throw new Error(`no literal --${role} in ${mode}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

const PALETTES = palettes()

describe("palette contrast (R20.1)", () => {
  it("parses every palette", () => {
    expect(Object.keys(PALETTES)).toEqual(["ocean", "aurora", "emerald", "sunset", "graphite", "ruby"])
  })

  for (const [name, p] of Object.entries(PALETTES)) {
    for (const mode of ["light", "dark"] as const) {
      it(`${name} ${mode}: accent-fg on accent and accent-2`, () => {
        const darkGraphite = name === "graphite" && mode === "dark"
        const l = darkGraphite ? 0.93 : (p["accent-l"] ?? 0)
        const fgL = darkGraphite ? 0.2 : (p["accent-fg-l"] ?? 0)
        const fg = oklchToRgb(fgL, 0.005, p["accent-h"] ?? 0)
        const accent = oklchToRgb(l, p["accent-c"] ?? 0, p["accent-h"] ?? 0)
        const accent2 = oklchToRgb(l, p["accent-c"] ?? 0, p["accent-2-h"] ?? 0)
        expect(contrast(fg, accent)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(fg, accent2)).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  for (const mode of ["light", "dark"] as const) {
    for (const tone of ["success", "warning", "danger", "info"]) {
      it(`${mode}: ${tone}-fg on ${tone}`, () => {
        expect(contrast(oklchToRgb(...literalRole(mode, `${tone}-fg`)), oklchToRgb(...literalRole(mode, tone)))).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
})
