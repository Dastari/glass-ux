/**
 * tokens:allow-file colour maths: turns resolved CSS colours (oklch, oklab, color(), rgb, hex) into the rgba() strings MapLibre's style spec accepts.
 *
 * MapLibre parses only sRGB colour syntax, but every Glass UX token is OKLCH or a color-mix().
 * The map resolves its tokens in the browser (a probe element's computed `color`, which the
 * browser has already reduced to one colour function) and converts them here. Gamut is
 * clipped per channel, which is what the browser does when it paints the same token.
 */

export interface Rgba {
  /** 0–255 */
  r: number
  g: number
  b: number
  /** 0–1 */
  a: number
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

/** sRGB transfer: linear light → encoded. */
function encode(linear: number) {
  const sign = linear < 0 ? -1 : 1
  const abs = Math.abs(linear)
  return sign * (abs <= 0.0031308 ? 12.92 * abs : 1.055 * abs ** (1 / 2.4) - 0.055)
}

/** sRGB transfer: encoded → linear light (display-p3 shares it). */
function decode(encoded: number) {
  const sign = encoded < 0 ? -1 : 1
  const abs = Math.abs(encoded)
  return sign * (abs <= 0.04045 ? abs / 12.92 : ((abs + 0.055) / 1.055) ** 2.4)
}

function fromLinear(r: number, g: number, b: number, a: number): Rgba {
  return {
    r: Math.round(clamp(encode(r)) * 255),
    g: Math.round(clamp(encode(g)) * 255),
    b: Math.round(clamp(encode(b)) * 255),
    a: clamp(a),
  }
}

/** OKLab → linear sRGB (Björn Ottosson's matrices). */
export function oklabToRgba(l: number, a: number, b: number, alpha = 1): Rgba {
  const lCone = l + 0.3963377774 * a + 0.2158037573 * b
  const mCone = l - 0.1055613458 * a - 0.0638541728 * b
  const sCone = l - 0.0894841775 * a - 1.291485548 * b
  const L = lCone ** 3
  const M = mCone ** 3
  const S = sCone ** 3
  return fromLinear(
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
    alpha
  )
}

export function oklchToRgba(l: number, c: number, h: number, alpha = 1): Rgba {
  const radians = (h * Math.PI) / 180
  return oklabToRgba(l, c * Math.cos(radians), c * Math.sin(radians), alpha)
}

/** One component: a number, a percentage of `percent`, an angle, or `none` (zero). */
function component(token: string | undefined, percent = 1): number {
  if (!token || token === "none") return 0
  if (token.endsWith("%")) return (Number.parseFloat(token) / 100) * percent
  if (token.endsWith("deg")) return Number.parseFloat(token)
  if (token.endsWith("turn")) return Number.parseFloat(token) * 360
  if (token.endsWith("rad")) return (Number.parseFloat(token) * 180) / Math.PI
  return Number.parseFloat(token)
}

/** The arguments of `name(…)`: channels and an optional alpha after "/". */
function args(body: string): { channels: string[]; alpha: number } {
  const [main = "", alphaPart] = body.split("/")
  const channels = main
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  // Legacy comma syntax (rgba(1, 2, 3, 0.5)) carries alpha as a fourth channel.
  const legacyAlpha = alphaPart === undefined && main.includes(",") && channels.length === 4 ? channels.pop() : undefined
  const alphaToken = (alphaPart ?? legacyAlpha)?.trim()
  return { channels, alpha: alphaToken === undefined ? 1 : component(alphaToken, 1) }
}

/**
 * Parse a computed CSS colour. Returns null for anything it does not understand (a keyword
 * other than `transparent`, a `var()` that never resolved), so a caller can fall back.
 */
export function parseColour(input: string): Rgba | null {
  const value = input.trim().toLowerCase()
  if (!value) return null
  if (value === "transparent") return { r: 0, g: 0, b: 0, a: 0 }
  if (value.startsWith("#")) {
    const hex = value.slice(1)
    const full = hex.length <= 4 ? [...hex].map((digit) => digit + digit).join("") : hex
    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(full)) return null
    const n = (offset: number) => Number.parseInt(full.slice(offset, offset + 2), 16)
    return { r: n(0), g: n(2), b: n(4), a: full.length === 8 ? n(6) / 255 : 1 }
  }
  const match = /^([a-z-]+)\((.*)\)$/.exec(value)
  if (!match) return null
  const [, name, body = ""] = match
  const { channels, alpha } = args(body)
  switch (name) {
    case "rgb":
    case "rgba": {
      const [r, g, b] = channels.map((token) => component(token, 255))
      return { r: Math.round(clamp(r ?? 0, 0, 255)), g: Math.round(clamp(g ?? 0, 0, 255)), b: Math.round(clamp(b ?? 0, 0, 255)), a: clamp(alpha) }
    }
    case "oklch":
      return oklchToRgba(component(channels[0], 1), component(channels[1], 0.4), component(channels[2]), alpha)
    case "oklab":
      return oklabToRgba(component(channels[0], 1), component(channels[1], 0.4), component(channels[2], 0.4), alpha)
    case "color": {
      const [space, ...rest] = channels
      const [x, y, z] = rest.map((token) => component(token, 1))
      if (space === "srgb") return fromLinear(decode(x ?? 0), decode(y ?? 0), decode(z ?? 0), alpha)
      if (space === "srgb-linear") return fromLinear(x ?? 0, y ?? 0, z ?? 0, alpha)
      if (space === "display-p3") {
        const [r, g, b] = [decode(x ?? 0), decode(y ?? 0), decode(z ?? 0)]
        return fromLinear(1.2249401 * r - 0.2249404 * g, -0.0420569 * r + 1.0420571 * g, -0.0196376 * r - 0.0786361 * g + 1.0982735 * b, alpha)
      }
      return null
    }
    default:
      return null
  }
}

/** The rgba() string MapLibre takes, with alpha multiplied by `opacity`. */
export function toCss(colour: Rgba, opacity = 1): string {
  const a = Math.round(clamp(colour.a * opacity) * 1000) / 1000
  return `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${a})`
}

/** Relative luminance (WCAG), for picking light or dark treatments. */
export function luminance({ r, g, b }: Rgba): number {
  const [R, G, B] = [r, g, b].map((channel) => decode(channel / 255)) as [number, number, number]
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}
