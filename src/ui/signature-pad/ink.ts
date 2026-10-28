/**
 * Signature ink: the stored value, the outline drawn for each stroke and the exports.
 * Pure functions with no DOM access except `signatureToPng`, so the value can be rendered
 * and exported on a server.
 */

/** One sampled point of a stroke, in the signature's own coordinates. */
export interface SignaturePoint {
  x: number
  y: number
  /** Milliseconds since the stroke began. */
  t: number
  /** Pen pressure from 0 to 1; 0.5 where the device reports none (mouse, most touch). */
  p: number
}

/** One pen-down to pen-up movement. */
export type SignatureStroke = SignaturePoint[]

/** A drawn signature: its strokes in a box of `width` × `height` units. */
export interface DrawnSignature {
  kind: "drawn"
  /** The box the points are in. The pad keeps its aspect ratio, so the drawing scales to any size. */
  width: number
  height: number
  strokes: SignatureStroke[]
}

/** A signature typed as a name instead of drawn. */
export interface TypedSignature {
  kind: "typed"
  text: string
}

/** A signature, drawn or typed. An empty pad is `null`. */
export type SignatureValue = DrawnSignature | TypedSignature

/** Width of the coordinate box every drawing is stored in; its height follows the aspect ratio. */
export const SIGNATURE_BOX_WIDTH = 600

/** Font stack for typed signatures, shared by the pad, SVG export and PNG export. */
export const SIGNATURE_SCRIPT_FONT = '"Segoe Script", "Snell Roundhand", "Apple Chancery", "Brush Script MT", "URW Chancery L", cursive'

/** True when there is nothing signed: null, no strokes, or blank typed text. */
export function isSignatureEmpty(value: SignatureValue | null | undefined): boolean {
  if (!value) return true
  return value.kind === "typed" ? value.text.trim() === "" : value.strokes.every((stroke) => stroke.length === 0)
}

// ── Outline ────────────────────────────────────────────────────────────────

/** Ink width in box units at rest; strokes thin to `MIN_RATIO` of it when fast. */
const INK = 3.2
const MIN_RATIO = 0.45
/** Speed (units per ms) at which a stroke reaches its thinnest. */
const FAST = 2.4
/** How strongly the centre line follows each new point (lower is smoother). */
const FOLLOW = 0.55

const round = (value: number) => Math.round(value * 100) / 100

/** Widths from speed and pressure, eased so the line swells and thins smoothly. */
function widths(points: SignatureStroke): number[] {
  const out: number[] = []
  let previous = INK
  for (let index = 0; index < points.length; index++) {
    const point = points[index]!
    const before = points[index - 1]
    let speed = 0
    if (before) {
      const distance = Math.hypot(point.x - before.x, point.y - before.y)
      speed = distance / Math.max(1, point.t - before.t)
    }
    const thinning = 1 - (1 - MIN_RATIO) * Math.min(1, speed / FAST)
    const pressure = 0.6 + 0.8 * Math.min(1, Math.max(0, point.p))
    const target = INK * thinning * pressure
    previous = index === 0 ? target : previous + (target - previous) * 0.35
    out.push(previous)
  }
  return out
}

/** The centre line, streamlined so hand tremor does not show. */
function streamline(points: SignatureStroke): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (const point of points) {
    const last = out[out.length - 1]
    if (!last) out.push({ x: point.x, y: point.y })
    else {
      const next = { x: last.x + (point.x - last.x) * FOLLOW, y: last.y + (point.y - last.y) * FOLLOW }
      if (Math.hypot(next.x - last.x, next.y - last.y) >= 0.4) out.push(next)
    }
  }
  // Streamlining lags behind the pen: end on the last real point.
  const end = points[points.length - 1]
  const tail = out[out.length - 1]
  if (end && tail && (tail.x !== end.x || tail.y !== end.y) && out.length > 1) out.push({ x: end.x, y: end.y })
  return out
}

function dot(x: number, y: number, radius: number): string {
  const r = round(radius)
  return `M${round(x - r)} ${round(y)}a${r} ${r} 0 1 0 ${round(r * 2)} 0a${r} ${r} 0 1 0 ${round(-r * 2)} 0Z`
}

/** A smooth path through `points`: quadratic curves via the midpoints, as `L`/`Q` commands. */
function through(points: { x: number; y: number }[]): string {
  let d = ""
  for (let index = 1; index < points.length - 1; index++) {
    const point = points[index]!
    const next = points[index + 1]!
    d += `Q${round(point.x)} ${round(point.y)} ${round((point.x + next.x) / 2)} ${round((point.y + next.y) / 2)}`
  }
  const last = points[points.length - 1]!
  return `${d}L${round(last.x)} ${round(last.y)}`
}

/**
 * The filled outline of one stroke as SVG path data: the centre line offset either side by
 * half the ink width (thinner where the pen moved fast, fuller under pressure), with round ends.
 */
export function strokeOutline(stroke: SignatureStroke): string {
  if (stroke.length === 0) return ""
  const line = streamline(stroke)
  const sizes = widths(stroke)
  const size = (index: number) => sizes[Math.min(sizes.length - 1, Math.round((index / Math.max(1, line.length - 1)) * (sizes.length - 1)))]!
  if (line.length === 1) return dot(line[0]!.x, line[0]!.y, size(0) / 2)

  const left: { x: number; y: number }[] = []
  const right: { x: number; y: number }[] = []
  for (let index = 0; index < line.length; index++) {
    const before = line[Math.max(0, index - 1)]!
    const after = line[Math.min(line.length - 1, index + 1)]!
    const dx = after.x - before.x
    const dy = after.y - before.y
    const length = Math.hypot(dx, dy) || 1
    const half = size(index) / 2
    const nx = (-dy / length) * half
    const ny = (dx / length) * half
    const point = line[index]!
    left.push({ x: point.x + nx, y: point.y + ny })
    right.push({ x: point.x - nx, y: point.y - ny })
  }
  const start = left[0]!
  const endRadius = round(size(line.length - 1) / 2)
  const startRadius = round(size(0) / 2)
  const back = right.reverse()
  const first = back[0]!
  return (
    `M${round(start.x)} ${round(start.y)}` +
    through(left) +
    `A${endRadius} ${endRadius} 0 0 1 ${round(first.x)} ${round(first.y)}` +
    through(back) +
    `A${startRadius} ${startRadius} 0 0 1 ${round(start.x)} ${round(start.y)}Z`
  )
}

// ── Exports ────────────────────────────────────────────────────────────────

export interface SignatureExportOptions {
  /** Ink colour. Default black, which prints and scans well on any paper. */
  color?: string
  /** Background; transparent by default. */
  background?: string
  /** Output width in pixels (PNG) or user units (SVG). Default the stored box width (600). */
  width?: number
  /** The drawing's aspect ratio for a typed signature, width ÷ height. Default 3. */
  aspectRatio?: number
}

/** Exported images are printed and filed, so their ink is black whatever the theme. */
const EXPORT_INK = "#000" // tokens:allow exports leave the theme for paper and documents

const escapeXml = (text: string) => text.replace(/[<>&"']/g, (character) => `&#${character.charCodeAt(0)};`)

function box(value: SignatureValue, options: SignatureExportOptions) {
  const width = value.kind === "drawn" ? value.width : SIGNATURE_BOX_WIDTH
  const height = value.kind === "drawn" ? value.height : SIGNATURE_BOX_WIDTH / (options.aspectRatio ?? 3)
  const scale = (options.width ?? width) / width
  return { width, height, outWidth: round(width * scale), outHeight: round(height * scale) }
}

/** A typed signature's font size: as large as fits the box, up to 40% of its height. */
export function typedFontSize(text: string, width: number, height: number): number {
  // Script faces average about 0.5em per character.
  return round(Math.min(height * 0.4, (width * 0.8) / Math.max(1, text.length * 0.5)))
}

/**
 * The signature as a standalone SVG document. Drawn strokes are filled outlines; a typed
 * signature is text in a script face (the viewer's fonts decide its look).
 */
export function signatureToSvg(value: SignatureValue, options: SignatureExportOptions = {}): string {
  const color = options.color ?? EXPORT_INK
  const { width, height, outWidth, outHeight } = box(value, options)
  const background = options.background ? `<rect width="${width}" height="${height}" fill="${escapeXml(options.background)}"/>` : ""
  const ink =
    value.kind === "drawn"
      ? value.strokes.map((stroke) => `<path d="${strokeOutline(stroke)}"/>`).join("")
      : `<text x="${width / 2}" y="${round(height * 0.62)}" text-anchor="middle" font-family="${escapeXml(SIGNATURE_SCRIPT_FONT)}" font-size="${typedFontSize(value.text, width, height)}">${escapeXml(value.text)}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outWidth}" height="${outHeight}" viewBox="0 0 ${width} ${height}">${background}<g fill="${escapeXml(color)}">${ink}</g></svg>`
}

/**
 * The signature as a PNG image. Browser only (it draws on a canvas). The default width is
 * the stored box; pass a larger `width` for print.
 */
export async function signatureToPng(value: SignatureValue, options: SignatureExportOptions = {}): Promise<Blob> {
  const { width, height, outWidth, outHeight } = box(value, options)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(outWidth)
  canvas.height = Math.round(outHeight)
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas 2D is not available")
  context.scale(canvas.width / width, canvas.height / height)
  if (options.background) {
    context.fillStyle = options.background
    context.fillRect(0, 0, width, height)
  }
  context.fillStyle = options.color ?? EXPORT_INK
  if (value.kind === "drawn") {
    for (const stroke of value.strokes) context.fill(new Path2D(strokeOutline(stroke)))
  } else {
    context.font = `${typedFontSize(value.text, width, height)}px ${SIGNATURE_SCRIPT_FONT}`
    context.textAlign = "center"
    context.fillText(value.text, width / 2, height * 0.62)
  }
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))), "image/png"))
}
