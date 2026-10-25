/**
 * tokens:allow-file colour maths for the colour picker.
 *
 * The picker works in OKLCH, the space the library's palettes are written in: equal steps of
 * lightness look equal, and a hue keeps its lightness as chroma changes. Values come and go
 * as sRGB hex (`#rrggbb`, or `#rrggbbaa` with alpha), the form applications store.
 */

/** A colour in OKLCH with alpha: lightness 0–1, chroma 0–~0.37, hue 0–360, alpha 0–1. */
export interface Oklch {
  l: number
  c: number
  h: number
  a: number
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)

/** Linear sRGB of an OKLCH colour (may fall outside 0–1 when the colour is out of gamut). */
export function oklchToLinear(l: number, c: number, h: number): [number, number, number] {
  const rad = (h * Math.PI) / 180
  const A = c * Math.cos(rad)
  const B = c * Math.sin(rad)
  const L = Math.pow(l + 0.3963377774 * A + 0.2158037573 * B, 3)
  const M = Math.pow(l - 0.1055613458 * A - 0.0638541728 * B, 3)
  const S = Math.pow(l - 0.0894841775 * A - 1.291485548 * B, 3)
  return [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ]
}

const EPSILON = 0.0005

/** Whether an OKLCH colour can be shown in sRGB. */
export function inGamut(l: number, c: number, h: number): boolean {
  return oklchToLinear(l, c, h).every((v) => v >= -EPSILON && v <= 1 + EPSILON)
}

/** The largest chroma at this lightness and hue that stays in sRGB (binary search). */
export function maxChroma(l: number, h: number): number {
  if (l <= 0 || l >= 1) return 0
  let lo = 0
  let hi = 0.4
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(l, mid, h)) lo = mid
    else hi = mid
  }
  return lo
}

/** The largest chroma any lightness reaches at this hue: the width of the picker's area. */
export function peakChroma(h: number): number {
  let peak = 0
  for (let l = 0.02; l < 1; l += 0.02) peak = Math.max(peak, maxChroma(l, h))
  return peak
}

/** The colour with chroma reduced until it fits in sRGB. */
export function clampToGamut(color: Oklch): Oklch {
  return inGamut(color.l, color.c, color.h) ? color : { ...color, c: maxChroma(color.l, color.h) }
}

const HEX = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/** Read `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` (the `#` optional) as OKLCH, or null. */
export function parseHex(value: string): Oklch | null {
  const match = HEX.exec(value.trim())
  if (!match) return null
  let hex = match[1]!
  if (hex.length <= 4) hex = hex.replace(/./g, (ch) => ch + ch)
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255
  const [r, g, b] = [toLinear(n(0)), toLinear(n(2)), toLinear(n(4))]
  const a = hex.length === 8 ? n(6) : 1
  const L = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const M = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const S = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const l = 0.2104542553 * L + 0.793617785 * M - 0.0040720468 * S
  const A = 1.9779984951 * L - 2.428592205 * M + 0.4505937099 * S
  const B = 0.0259040371 * L + 0.7827717662 * M - 0.808675766 * S
  const h = (Math.atan2(B, A) * 180) / Math.PI
  return { l, c: Math.sqrt(A * A + B * B), h: h < 0 ? h + 360 : h, a }
}

const byte = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255)
const pair = (v: number) => v.toString(16).padStart(2, "0")

/** sRGB bytes of an OKLCH colour, clipped to the gamut. */
export function toRgb(color: Pick<Oklch, "l" | "c" | "h">): [number, number, number] {
  return oklchToLinear(color.l, color.c, color.h).map((v) => byte(toGamma(Math.min(1, Math.max(0, v))))) as [number, number, number]
}

/** `#rrggbb`, or `#rrggbbaa` when `alpha` is true and the colour is not opaque. */
export function formatHex(color: Oklch, alpha = false): string {
  const hex = `#${toRgb(color).map(pair).join("")}`
  return alpha && color.a < 1 ? hex + pair(byte(color.a)) : hex
}

/** A CSS colour for display (`oklch(...)`), gamut-clamped so every browser shows the same colour. */
export function cssColor(color: Oklch): string {
  const { l, c, h } = clampToGamut(color)
  return `oklch(${(l * 100).toFixed(2)}% ${c.toFixed(4)} ${h.toFixed(2)}${color.a < 1 ? ` / ${color.a.toFixed(3)}` : ""})`
}

/** WCAG relative luminance of an OKLCH colour (clipped to sRGB). */
export function luminance(color: Pick<Oklch, "l" | "c" | "h">): number {
  const [r, g, b] = oklchToLinear(color.l, color.c, color.h).map((v) => Math.min(1, Math.max(0, v)))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

/** WCAG contrast ratio between two colours. */
export function contrast(a: Pick<Oklch, "l" | "c" | "h">, b: Pick<Oklch, "l" | "c" | "h">): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** A hue gradient for a track: stops every 30° at a lightness and chroma most hues can show. */
export function hueGradient(direction = "to right"): string {
  const stops = Array.from({ length: 13 }, (_, i) => `oklch(72% 0.14 ${i * 30})`)
  return `linear-gradient(${direction}, ${stops.join(", ")})`
}

/** How strongly colours outside sRGB are drawn (0–255): enough to show the gamut's shape. */
const OUTSIDE = 40

/**
 * Paint the picker's area into a canvas: lightness up the side, chroma across (to `peak`), at
 * `hue`. Colours outside sRGB are drawn faintly, so the gamut's edge shows.
 */
export function paintArea(canvas: HTMLCanvasElement, hue: number, peak: number): void {
  const context = canvas.getContext("2d")
  if (!context) return
  const { width, height } = canvas
  const image = context.createImageData(width, height)
  const data = image.data
  // One pixel's worth of chroma: the edge fades across it, so the gamut's outline is smooth.
  const pixel = peak / (width - 1)
  for (let y = 0; y < height; y++) {
    const l = 1 - y / (height - 1)
    const edge = maxChroma(l, hue)
    for (let x = 0; x < width; x++) {
      const c = (x / (width - 1)) * peak
      const inside = Math.min(1, Math.max(0, (edge - c) / pixel + 0.5))
      const [r, g, b] = toRgb({ l, c: Math.min(c, edge), h: hue })
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = Math.round(OUTSIDE + (255 - OUTSIDE) * inside)
    }
  }
  context.putImageData(image, 0, 0)
}
