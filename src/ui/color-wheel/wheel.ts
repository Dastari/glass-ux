/**
 * tokens:allow-file colour maths for the colour wheel.
 *
 * The wheel is the OKLab a–b plane at one lightness: hue is the OKLCH hue, the angle from the
 * +a axis (to the right), counter-clockwise; the distance from the centre is chroma, 0 (grey)
 * at the centre up to WHEEL_CHROMA at the rim. Every hue reaches the same chroma at
 * WHEEL_LIGHTNESS inside sRGB, so the disc is even all the way round and the bead's CSS colour
 * is the disc's colour beneath it.
 */
import { toRgb, type Oklch } from "../color-picker/color.js"

/** A colour wheel value: a direction and how far from neutral. */
export interface ColorWheelValue {
  /** Degrees, 0 to under 360: the OKLCH hue, 0° to the right of the centre, rising counter-clockwise. */
  hue: number
  /** 0 at the neutral centre up to the wheel's `max` at the rim. */
  amount: number
}

/** The disc's lightness: the highest at which every hue reaches WHEEL_CHROMA in sRGB. */
export const WHEEL_LIGHTNESS = 0.75
/** The disc's chroma at the rim. */
export const WHEEL_CHROMA = 0.125

/** Round to a multiple of `step`, without binary noise (0.1 + 0.2). */
export function snap(value: number, step: number): number {
  if (!(step > 0)) return value
  return Number((Math.round(value / step) * step).toPrecision(12))
}

/** A hue in [0, 360). */
export function wrapHue(hue: number): number {
  const wrapped = hue % 360
  return Number((wrapped < 0 ? wrapped + 360 : wrapped).toPrecision(12)) % 360
}

/** The value inside the wheel: hue wrapped and snapped to `hueStep`, amount clamped to 0…max and snapped to `step`. */
export function normalizeWheel(value: ColorWheelValue, max: number, step: number, hueStep: number): ColorWheelValue {
  const amount = Math.min(max, Math.max(0, snap(value.amount, step)))
  return { hue: wrapHue(snap(wrapHue(value.hue), hueStep)), amount }
}

/**
 * A point in the wheel as a value. `x` and `y` are offsets from the centre in the same unit as
 * `radius` (the rim), with y pointing down as on screen. A point at the very centre keeps
 * `previousHue`, since the centre has no direction.
 */
export function pointToWheel(x: number, y: number, radius: number, max: number, previousHue: number): ColorWheelValue {
  const distance = Math.hypot(x, y)
  const fraction = radius > 0 ? Math.min(1, distance / radius) : 0
  const hue = distance < 1e-6 ? previousHue : wrapHue((Math.atan2(-y, x) * 180) / Math.PI)
  return { hue, amount: fraction * max }
}

/** Where a value sits, as offsets from the centre in fractions of the radius (y down). */
export function wheelToPoint(value: ColorWheelValue, max: number): { x: number; y: number } {
  const fraction = max > 0 ? Math.min(1, Math.max(0, value.amount / max)) : 0
  const angle = (value.hue * Math.PI) / 180
  return { x: Math.cos(angle) * fraction, y: -Math.sin(angle) * fraction }
}

/**
 * The colour the wheel shows for a value: the disc's colour under the bead. Pass it to
 * `cssColor` or `formatHex` from `glass-ux/color-picker` for a preview chip or a stored tint.
 */
export function colorWheelColor(value: ColorWheelValue, max = 100): Oklch {
  const fraction = max > 0 ? Math.min(1, Math.max(0, value.amount / max)) : 0
  return { l: WHEEL_LIGHTNESS, c: WHEEL_CHROMA * fraction, h: wrapHue(value.hue), a: 1 }
}

/** Hue families for the spoken value, by their centres in OKLCH degrees (sRGB red is 29°, blue 264°). */
export const HUE_FAMILIES = [
  ["red", 25],
  ["orange", 58],
  ["yellow", 98],
  ["green", 142],
  ["cyan", 195],
  ["blue", 258],
  ["purple", 298],
  ["magenta", 335],
] as const

export type HueFamily = (typeof HUE_FAMILIES)[number][0]

/** The hue family nearest a hue, for a name a person can picture ("green") beside the degrees. */
export function hueFamily(hue: number): HueFamily {
  const h = wrapHue(hue)
  let best: HueFamily = "red"
  let distance = Infinity
  for (const [name, centre] of HUE_FAMILIES) {
    const d = Math.min(Math.abs(h - centre), 360 - Math.abs(h - centre))
    if (d < distance) {
      distance = d
      best = name
    }
  }
  return best
}

/**
 * Paint the disc into a square canvas: the OKLab a–b plane at WHEEL_LIGHTNESS, chroma rising
 * linearly from the centre to WHEEL_CHROMA at the canvas's inscribed circle. Pixels outside the
 * circle are left transparent (the element's own rounding clips it cleanly).
 */
export function paintWheel(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d")
  if (!context) return
  const size = canvas.width
  const image = context.createImageData(size, size)
  const data = image.data
  const half = (size - 1) / 2
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px - half) / half
      const y = (half - py) / half
      const r = Math.hypot(x, y)
      const i = (py * size + px) * 4
      if (r > 1 + 1 / half) continue
      const h = (Math.atan2(y, x) * 180) / Math.PI
      const [red, green, blue] = toRgb({ l: WHEEL_LIGHTNESS, c: WHEEL_CHROMA * Math.min(1, r), h: h < 0 ? h + 360 : h })
      data[i] = red
      data[i + 1] = green
      data[i + 2] = blue
      data[i + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
}
