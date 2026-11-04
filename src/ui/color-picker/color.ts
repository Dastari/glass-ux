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

/**
 * The largest chroma any lightness reaches at this hue: the width of the picker's area. It is the
 * hue's cusp; a search over lightness would also count the near-black colours that only fit within
 * the gamut test's rounding allowance.
 */
export function peakChroma(h: number): number {
  return hueCusp(h).c
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
  const a = hex.length === 8 ? n(6) : 1
  return { ...linearToOklch(toLinear(n(0)), toLinear(n(2)), toLinear(n(4))), a }
}

/** OKLCH of a linear sRGB colour (channels 0–1). */
function linearToOklch(r: number, g: number, b: number): Omit<Oklch, "a"> {
  const L = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const M = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const S = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const l = 0.2104542553 * L + 0.793617785 * M - 0.0040720468 * S
  const A = 1.9779984951 * L - 2.428592205 * M + 0.4505937099 * S
  const B = 0.0259040371 * L + 0.7827717662 * M - 0.808675766 * S
  const h = (Math.atan2(B, A) * 180) / Math.PI
  return { l, c: Math.sqrt(A * A + B * B), h: h < 0 ? h + 360 : h }
}

/**
 * The largest saturation (chroma / lightness) sRGB reaches along a hue, `a` and `b` the hue's unit
 * vector in OKLab. Björn Ottosson's fit from "sRGB gamut clipping" (2021): a polynomial guess for
 * the channel that clips first, then one Halley step.
 */
function maxSaturation(a: number, b: number): number {
  let k: [number, number, number, number, number]
  let w: [number, number, number]
  if (-1.88170328 * a - 0.80936493 * b > 1) {
    k = [1.19086277, 1.76576728, 0.59662641, 0.75515197, 0.56771245]
    w = [4.0767416621, -3.3077115913, 0.2309699292]
  } else if (1.81444104 * a - 1.19445276 * b > 1) {
    k = [0.73956515, -0.45954404, 0.08285427, 0.1254107, 0.14503204]
    w = [-1.2684380046, 2.6097574011, -0.3413193965]
  } else {
    k = [1.35733652, -0.00915799, -1.1513021, -0.50559606, 0.00692167]
    w = [-0.0041960863, -0.7034186147, 1.707614701]
  }
  let S = k[0] + k[1] * a + k[2] * b + k[3] * a * a + k[4] * a * b
  const kl = 0.3963377774 * a + 0.2158037573 * b
  const km = -0.1055613458 * a - 0.0638541728 * b
  const ks = -0.0894841775 * a - 1.291485548 * b
  const l_ = 1 + S * kl
  const m_ = 1 + S * km
  const s_ = 1 + S * ks
  const f = w[0] * l_ ** 3 + w[1] * m_ ** 3 + w[2] * s_ ** 3
  const f1 = w[0] * 3 * kl * l_ ** 2 + w[1] * 3 * km * m_ ** 2 + w[2] * 3 * ks * s_ ** 2
  const f2 = w[0] * 6 * kl * kl * l_ + w[1] * 6 * km * km * m_ + w[2] * 6 * ks * ks * s_
  S -= (f * f1) / (f1 * f1 - 0.5 * f * f2)
  return S
}

/** The most saturated colour sRGB can show at an OKLCH hue: its lightness and chroma. */
export function hueCusp(hue: number): { l: number; c: number } {
  const rad = (hue * Math.PI) / 180
  const a = Math.cos(rad)
  const b = Math.sin(rad)
  const S = maxSaturation(a, b)
  const rgb = oklchToLinear(1, S, hue)
  const l = Math.cbrt(1 / Math.max(rgb[0], rgb[1], rgb[2]))
  return { l, c: l * S }
}

/** A hue at its most saturated in sRGB, as a CSS colour: the colour a hue track or hue thumb shows. */
export function vividHue(hue: number): string {
  const { l, c } = hueCusp(hue)
  return cssColor({ l, c, h: hue, a: 1 })
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

/** A hue gradient for a track: each hue at its most saturated in sRGB, a stop every 10°. */
export function hueGradient(direction = "to right"): string {
  const stops = Array.from({ length: 37 }, (_, i) => vividHue(i * 10))
  return `linear-gradient(${direction}, ${stops.join(", ")})`
}

/** A colour as hue (0–360°), saturation and value (0–1), the plane many editors and design tools show. */
export interface Hsv {
  h: number
  s: number
  v: number
}

/** sRGB bytes to HSV. A grey has no hue, so `fallbackHue` (the hue it had before) is kept. */
export function rgbToHsv([r, g, b]: [number, number, number], fallbackHue = 0): Hsv {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = fallbackHue
  if (delta > 0) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h = (h * 60 + 360) % 360
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max / 255 }
}

/** HSV to sRGB bytes. */
export function hsvToRgb({ h, s, v }: Hsv): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return byte(v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))
  }
  return [f(5), f(3), f(1)]
}

/** `#rrggbb` of an HSV colour. */
export function hsvToHex(hsv: Hsv): string {
  return `#${hsvToRgb(hsv).map(pair).join("")}`
}

/** A hue gradient for an HSV hue track: the rainbow at full saturation and value. */
export function hsvHueGradient(direction = "to right"): string {
  const stops = Array.from({ length: 13 }, (_, i) => `hsl(${i * 30} 100% 50%)`)
  return `linear-gradient(${direction}, ${stops.join(", ")})`
}

/** Paint the HSV plane into a canvas: saturation across, value up the side, at `hue`. */
export function paintHsvArea(canvas: HTMLCanvasElement, hue: number): void {
  const context = canvas.getContext("2d")
  if (!context) return
  const { width, height } = canvas
  const image = context.createImageData(width, height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = hsvToRgb({ h: hue, s: x / (width - 1), v: 1 - y / (height - 1) })
      const i = (y * width + x) * 4
      image.data[i] = r
      image.data[i + 1] = g
      image.data[i + 2] = b
      image.data[i + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
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
