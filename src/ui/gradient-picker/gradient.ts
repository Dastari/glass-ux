/**
 * Gradients as data: pure helpers with no React and no DOM, so a server or a worker can turn a
 * saved value into CSS. Every colour written is sRGB, so the CSS shows the same colours on every
 * display: nothing relies on a wide-gamut screen to look the way the preview did.
 */
import { clampToGamut, formatHex, parseHex, type Oklch } from "../color-picker/color.js"

export type GradientKind = "linear" | "radial" | "angular"

/**
 * How colours blend between stops. `srgb` is the browser's default. `oklab` blends evenly to the
 * eye, written out as extra sRGB stops, each brought inside the gamut.
 */
export type GradientInterpolation = "srgb" | "oklab"

/** One colour on the gradient. */
export interface GradientStop {
  /** Hex: `#rrggbb`, or `#rrggbbaa` with opacity. */
  color: string
  /** Where it sits, 0 to 100 percent along the gradient. */
  position: number
}

/** A gradient. Stops stay in position order. */
export interface GradientValue {
  kind: GradientKind
  /** Degrees clockwise: the direction a linear gradient runs, as in CSS (90 is to the right), and where an angular one starts. A radial one ignores it. */
  angle: number
  stops: readonly GradientStop[]
  /** Default `srgb`. */
  interpolation?: GradientInterpolation
}

/** The starting value: a mid blue to a pale violet. */
export const DEFAULT_GRADIENT: GradientValue = {
  kind: "linear",
  angle: 90,
  stops: [
    { color: "#3b6fd4", position: 0 }, // tokens:allow a colour value, not a theme colour
    { color: "#c7b6f2", position: 100 }, // tokens:allow a colour value, not a theme colour
  ],
}

/** Blended colours written between two stops of an `oklab` gradient. */
const SAMPLES = 8

const round = (value: number) => Math.round(value * 10) / 10
const clampPosition = (position: number) => Math.min(100, Math.max(0, round(position)))
const inOrder = (stops: readonly GradientStop[]) => stops.toSorted((a, b) => a.position - b.position)

function channels(hex: string) {
  const color = parseHex(hex)
  const value = hex.replace("#", "")
  const full = value.length <= 4 ? value.replace(/./g, (ch) => ch + ch) : value
  const channel = (index: number) => Number.parseInt(full.slice(index, index + 2), 16)
  return { r: channel(0), g: channel(2), b: channel(4), a: color?.a ?? 1 }
}

const pair = (value: number) => Math.round(value).toString(16).padStart(2, "0")

/** Blend two colours in sRGB with premultiplied alpha, as a browser does. */
function mixSrgb(from: string, to: string, t: number) {
  const a = channels(from)
  const b = channels(to)
  const alpha = a.a + (b.a - a.a) * t
  const channel = (x: number, y: number) => (alpha === 0 ? 0 : (x * a.a + (y * b.a - x * a.a) * t) / alpha)
  const hex = `#${pair(channel(a.r, b.r))}${pair(channel(a.g, b.g))}${pair(channel(a.b, b.b))}`
  return alpha < 1 ? hex + pair(alpha * 255) : hex
}

const lab = ({ l, c, h, a }: Oklch) => ({ l, x: c * Math.cos((h * Math.PI) / 180), y: c * Math.sin((h * Math.PI) / 180), a })

/** Blend two colours in OKLab, then bring the result inside sRGB. */
function mixOklab(from: string, to: string, t: number) {
  const parsedA = parseHex(from)
  const parsedB = parseHex(to)
  if (!parsedA || !parsedB) return from
  const a = lab(parsedA)
  const b = lab(parsedB)
  const alpha = a.a + (b.a - a.a) * t
  const blend = (p: number, q: number) => (alpha === 0 ? 0 : (p * a.a + (q * b.a - p * a.a) * t) / alpha)
  const x = blend(a.x, b.x)
  const y = blend(a.y, b.y)
  const hue = (Math.atan2(y, x) * 180) / Math.PI
  return formatHex(clampToGamut({ l: blend(a.l, b.l), c: Math.hypot(x, y), h: hue < 0 ? hue + 360 : hue, a: alpha }), alpha < 1)
}

/** The colour the gradient shows at a position, as hex. */
export function gradientColorAt(value: Pick<GradientValue, "stops" | "interpolation">, position: number): string {
  const stops = inOrder(value.stops)
  const first = stops[0]
  const last = stops.at(-1)
  if (!first || !last) return "#000000" // tokens:allow a colour value, not a theme colour
  if (position <= first.position) return first.color
  if (position >= last.position) return last.color
  const index = stops.findIndex((stop) => stop.position >= position)
  const after = stops[index]!
  const before = stops[index - 1]!
  const t = (position - before.position) / Math.max(after.position - before.position, Number.EPSILON)
  return (value.interpolation === "oklab" ? mixOklab : mixSrgb)(before.color, after.color, t)
}

/** The stops as CSS, with the blended colours written out for `oklab`. */
export function gradientStopsCss(value: Pick<GradientValue, "stops" | "interpolation">): string {
  const stops = inOrder(value.stops)
  const parts = stops.flatMap((stop, index) => {
    const next = stops[index + 1]
    const own = `${stop.color} ${stop.position}%`
    if (value.interpolation !== "oklab" || !next || next.position === stop.position) return [own]
    const between = Array.from({ length: SAMPLES }, (_, sample) => {
      const t = (sample + 1) / (SAMPLES + 1)
      return `${mixOklab(stop.color, next.color, t)} ${round(stop.position + (next.position - stop.position) * t)}%`
    })
    return [own, ...between]
  })
  return parts.join(", ")
}

/** The gradient as a CSS `background-image` value. */
export function gradientToCss(value: GradientValue): string {
  const stops = gradientStopsCss(value)
  if (value.kind === "radial") return `radial-gradient(circle, ${stops})`
  if (value.kind === "angular") return `conic-gradient(from ${value.angle}deg, ${stops})`
  return `linear-gradient(${value.angle}deg, ${stops})`
}

/** Add a stop at a position, or in the middle of the widest gap, in the colour already there. Returns the new stop's index. */
export function addGradientStop(value: GradientValue, position?: number): { value: GradientValue; index: number } {
  const stops = inOrder(value.stops)
  let at = position
  if (at === undefined) {
    let widest = -1
    for (let index = 0; index < stops.length - 1; index++) {
      const gap = stops[index + 1]!.position - stops[index]!.position
      if (gap > widest) {
        widest = gap
        at = stops[index]!.position + gap / 2
      }
    }
  }
  const stop = { color: gradientColorAt(value, at ?? 50), position: clampPosition(at ?? 50) }
  const next = inOrder([...stops, stop])
  return { value: { ...value, stops: next }, index: next.indexOf(stop) }
}

/** Move a stop, keeping the stops in order. Returns the index it ends at. */
export function moveGradientStop(value: GradientValue, index: number, position: number): { value: GradientValue; index: number } {
  const moved = { ...value.stops[index]!, position: clampPosition(position) }
  const next = inOrder(value.stops.map((stop, at) => (at === index ? moved : stop)))
  return { value: { ...value, stops: next }, index: next.indexOf(moved) }
}

/** Remove a stop; a gradient keeps at least two. */
export function removeGradientStop(value: GradientValue, index: number): GradientValue {
  if (value.stops.length <= 2) return value
  return { ...value, stops: value.stops.filter((_, at) => at !== index) }
}
