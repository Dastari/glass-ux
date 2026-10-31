/**
 * Pure helpers for avatar photos: reading an image's size, checking a file against the
 * requirements, the crop square's geometry and drawing the cropped square. They use the
 * browser's Image and canvas only, no React, so an application can call them in its own flows.
 */
import { formatBytes, matchesAccept } from "../file-drop/files.js"
import { listFormat, numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"
import { getAvatarEditorMessages } from "./messages.js"

/** The default `accept`: PNG, JPEG or WebP. */
export const AVATAR_ACCEPT = "image/png,image/jpeg,image/webp"

/** Pixel dimensions of a decoded image, after its EXIF orientation. */
export interface AvatarImageSize {
  width: number
  height: number
}

/** What a photo must satisfy before it can be cropped and saved. */
export interface AvatarRequirements {
  /** Same syntax as <input accept>. Default `AVATAR_ACCEPT` (PNG, JPEG or WebP). */
  accept?: string
  /** Bytes per file. */
  maxSize?: number
  /** Smallest image width in pixels. The crop never takes fewer source pixels than the larger minimum. */
  minWidth?: number
  /** Smallest image height in pixels. */
  minHeight?: number
  /**
   * The application's own check once the file has decoded (a face detector, a moderation
   * call): return the reason to refuse it, written for the person, or nothing to accept it.
   */
  validate?: (file: File, image: AvatarImageSize) => string | undefined | Promise<string | undefined>
}

/** The image the crop produces. */
export interface AvatarOutput {
  /** Width and height in pixels. Default 512. */
  size?: number
  /** Media type for `canvas.toBlob`. Default `image/webp`; browsers that cannot encode it give PNG (see `AvatarChange.type`). */
  type?: string
  /** 0–1 for lossy types. Default 0.9. */
  quality?: number
}

/** A square of the source image, in its pixels. */
export interface AvatarCrop {
  x: number
  y: number
  size: number
}

export type AvatarRejectionReason = "type" | "size" | "unreadable" | "dimensions" | "invalid"

/** A file the dialog refused, with the reason shown on its message line. */
export interface AvatarRejection {
  file: File
  reason: AvatarRejectionReason
  /** Plain-language reason, ready to show. */
  message: string
}

/** The result of `checkAvatarFile`: the decoded size, or why the file was refused. */
export type AvatarFileCheck = { ok: true; image: AvatarImageSize } | { ok: false; rejection: AvatarRejection }

/** A saved photo: the cropped square, and the original with its crop for applications that crop on the server. */
export interface AvatarChange {
  /** The cropped square at the output size. */
  blob: Blob
  /** The blob's media type: the requested one, or PNG where the browser cannot encode it. */
  type: string
  width: number
  height: number
  /** The file the person chose. */
  original: File
  /** The square taken from the original, in its (orientation-corrected) pixels. */
  crop: AvatarCrop
  /** The original's dimensions. */
  source: AvatarImageSize
}

/** Where the crop square sits: `zoom` 1 fits the image's short side; the centre is in source pixels. */
export interface AvatarView {
  zoom: number
  centerX: number
  centerY: number
}

/** Zooming past this would show fewer source pixels than any useful avatar. */
const MAX_ZOOM = 4

const FORMAT_NAMES: Record<string, string> = {
  png: "PNG",
  jpeg: "JPEG",
  jpg: "JPEG",
  webp: "WebP",
  gif: "GIF",
  avif: "AVIF",
  heic: "HEIC",
  heif: "HEIF",
  bmp: "BMP",
  "svg+xml": "SVG",
  svg: "SVG",
}

/** "PNG, JPEG or WebP" from an accept string; `image/*` reads "any image". */
export function describeFormats(accept: string = AVATAR_ACCEPT, locale = getLocale(), messages = getAvatarEditorMessages(locale)): string {
  const names = new Set<string>()
  for (const raw of accept.split(",")) {
    const token = raw.trim().toLowerCase()
    if (!token) continue
    if (token.endsWith("/*")) {
      names.add(messages.anyImage)
      continue
    }
    const key = token.startsWith(".") ? token.slice(1) : (token.split("/")[1] ?? token)
    names.add(FORMAT_NAMES[key] ?? key.toUpperCase())
  }
  return listFormat(locale, { type: "disjunction" }).format([...names])
}

/** The limits line under the drop zone: "PNG, JPEG or WebP · Max 5 MB · At least 256 × 256 px". */
export function describeAvatarRequirements(requirements: AvatarRequirements = {}, locale = getLocale(), messages = getAvatarEditorMessages(locale)): string {
  const { maxSize, minWidth, minHeight } = requirements
  const number = numberFormat(locale)
  return [
    describeFormats(requirements.accept, locale, messages),
    maxSize === undefined ? null : messages.maxFileSize(formatBytes(maxSize, locale)),
    minWidth || minHeight ? messages.minPixels(number.format(minWidth ?? 1), number.format(minHeight ?? 1)) : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

/** Decode a blob into an image element; the caller revokes nothing, the URL is released once decoded. */
async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.decoding = "async"
    image.src = url
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("The image has no pixels.")
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Decode a photo and read its dimensions (EXIF orientation applied). Rejects when it is not an image. */
export async function readImageSize(blob: Blob): Promise<AvatarImageSize> {
  const image = await loadImage(blob)
  return { width: image.naturalWidth, height: image.naturalHeight }
}

/**
 * Check a file against the requirements in order — type, size, whether it decodes, its
 * dimensions, then `validate` — and stop at the first reason to refuse it.
 */
export async function checkAvatarFile(file: File, requirements: AvatarRequirements = {}, locale = getLocale()): Promise<AvatarFileCheck> {
  const messages = getAvatarEditorMessages(locale)
  const refuse = (reason: AvatarRejectionReason, message: string): AvatarFileCheck => ({ ok: false, rejection: { file, reason, message } })
  const accept = requirements.accept ?? AVATAR_ACCEPT
  if (!matchesAccept(file, accept)) return refuse("type", messages.notSupported(file.name, describeFormats(accept, locale, messages)))
  if (requirements.maxSize !== undefined && file.size > requirements.maxSize)
    return refuse("size", messages.tooLarge(file.name, formatBytes(requirements.maxSize, locale)))
  let image: AvatarImageSize
  try {
    image = await readImageSize(file)
  } catch {
    return refuse("unreadable", messages.unreadable(file.name))
  }
  const { minWidth = 0, minHeight = 0 } = requirements
  if (image.width < minWidth || image.height < minHeight) {
    const number = numberFormat(locale)
    return refuse("dimensions", messages.tooSmall(number.format(minWidth || 1), number.format(minHeight || 1)))
  }
  const reason = await requirements.validate?.(file, image)
  if (reason) return refuse("invalid", reason)
  return { ok: true, image }
}

/* ── Crop geometry ──────────────────────────────────────────────────────────── */

/** The furthest zoom: the crop keeps at least the larger minimum dimension of source pixels. */
export function maxZoomFor(image: AvatarImageSize, requirements: Pick<AvatarRequirements, "minWidth" | "minHeight"> = {}): number {
  const shortSide = Math.min(image.width, image.height)
  const floor = Math.max(requirements.minWidth ?? 0, requirements.minHeight ?? 0, 1)
  return Math.max(1, Math.min(MAX_ZOOM, shortSide / floor))
}

/** The view that fits the short side, centred. */
export function fitView(image: AvatarImageSize): AvatarView {
  return { zoom: 1, centerX: image.width / 2, centerY: image.height / 2 }
}

/** The crop square's side in source pixels at a zoom. */
export const cropSide = (image: AvatarImageSize, zoom: number) => Math.min(image.width, image.height) / zoom

/** Keep the zoom in range and the square inside the image. */
export function clampView(view: AvatarView, image: AvatarImageSize, maxZoom = MAX_ZOOM): AvatarView {
  const zoom = Math.min(Math.max(view.zoom, 1), Math.max(1, maxZoom))
  const half = cropSide(image, zoom) / 2
  const within = (value: number, size: number) => Math.min(Math.max(value, half), size - half)
  return { zoom, centerX: within(view.centerX, image.width), centerY: within(view.centerY, image.height) }
}

/** The crop square for a view, in whole source pixels and inside the image. */
export function cropFor(view: AvatarView, image: AvatarImageSize): AvatarCrop {
  const size = Math.max(1, Math.min(Math.round(cropSide(image, view.zoom)), image.width, image.height))
  const x = Math.min(Math.max(Math.round(view.centerX - size / 2), 0), image.width - size)
  const y = Math.min(Math.max(Math.round(view.centerY - size / 2), 0), image.height - size)
  return { x, y, size }
}

/* ── Drawing ────────────────────────────────────────────────────────────────── */

function canvasOf(size: number) {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas 2D is unavailable.")
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  return { canvas, context }
}

/**
 * Draw a square of the source at the output size and encode it. Large reductions halve in
 * steps, so browsers that ignore `imageSmoothingQuality` still give a smooth result.
 */
export async function cropImage(source: Blob, crop: AvatarCrop, output: AvatarOutput = {}): Promise<Blob> {
  const { size = 512, type = "image/webp", quality = 0.9 } = output
  const image = await loadImage(source)
  let current: CanvasImageSource = image
  let region = { x: crop.x, y: crop.y, size: crop.size }
  while (region.size / 2 >= size) {
    const step = Math.round(region.size / 2)
    const { canvas, context } = canvasOf(step)
    context.drawImage(current, region.x, region.y, region.size, region.size, 0, 0, step, step)
    current = canvas
    region = { x: 0, y: 0, size: step }
  }
  const { canvas, context } = canvasOf(size)
  // JPEG has no transparency: a transparent PNG would otherwise turn black.
  if (type === "image/jpeg") {
    context.fillStyle = "#fff" // tokens:allow encoded image pixels, not a theme colour
    context.fillRect(0, 0, size, size)
  }
  context.drawImage(current, region.x, region.y, region.size, region.size, 0, 0, size, size)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The photo could not be encoded."))), type, quality),
  )
}
