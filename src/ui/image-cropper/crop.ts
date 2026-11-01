/**
 * Pure helpers for cropping images: reading an image's size, checking a file against the
 * requirements, the crop's geometry and drawing the result. They use the browser's Image and
 * canvas only, no React, so an application can call them in its own flows.
 */
import { formatBytes, matchesAccept } from "../file-drop/files.js"
import { listFormat, numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"
import { getImageCropperMessages, type imageCropperMessages } from "./messages.js"

/** The default `accept`: PNG, JPEG or WebP. */
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp"

/** Pixel dimensions of a decoded image, after its EXIF orientation. */
export interface ImageSize {
  width: number
  height: number
}

/** What an image must satisfy before it can be cropped and saved. */
export interface ImageRequirements {
  /** Same syntax as <input accept>. Default `IMAGE_ACCEPT` (PNG, JPEG or WebP). */
  accept?: string
  /** Bytes per file. */
  maxSize?: number
  /** Smallest image width in pixels. The crop never takes fewer source pixels than this. */
  minWidth?: number
  /** Smallest image height in pixels. */
  minHeight?: number
  /**
   * The application's own check once the file has decoded (a moderation call, a resolution
   * policy): return the reason to refuse it, written for the person, or nothing to accept it.
   */
  validate?: (file: File, image: ImageSize) => string | undefined | Promise<string | undefined>
}

/** The image a crop produces. */
export interface ImageCropOutput {
  /** Width in pixels. Default: the crop's own width, or the `height` scaled to the crop's shape. */
  width?: number
  /** Height in pixels. Default: the crop's own height, or the `width` scaled to the crop's shape. */
  height?: number
  /** Media type for `canvas.toBlob`. Default `image/webp`; browsers that cannot encode it give PNG (see `ImageChange.type`). */
  type?: string
  /** 0–1 for lossy types. Default 0.9. */
  quality?: number
}

/** A rectangle of the source image, in its whole pixels. */
export interface ImageCropRect {
  x: number
  y: number
  width: number
  height: number
}

/** The width ÷ height the crop keeps, or `"free"` for any shape. */
export type ImageCropAspect = number | "free"

export type ImageRejectionReason = "type" | "size" | "unreadable" | "dimensions" | "invalid"

/** A file that was refused, with the reason shown on the message line. */
export interface ImageRejection {
  file: File
  reason: ImageRejectionReason
  /** Plain-language reason, ready to show. */
  message: string
}

/** The result of `checkImageFile`: the decoded size, or why the file was refused. */
export type ImageFileCheck = { ok: true; image: ImageSize } | { ok: false; rejection: ImageRejection }

/** A saved crop: the cropped image, and the original with its crop for applications that crop on the server. */
export interface ImageChange {
  /** The cropped image at the output size. */
  blob: Blob
  /** The blob's media type: the requested one, or PNG where the browser cannot encode it. */
  type: string
  width: number
  height: number
  /** The file the person chose. */
  original: File
  /** The rectangle taken from the original, in its (orientation-corrected) pixels. */
  crop: ImageCropRect
  /** The original's dimensions. */
  source: ImageSize
}

/** Where a locked crop sits: `zoom` 1 is the largest crop of its shape; the centre is in source pixels. */
export interface ImageCropView {
  zoom: number
  centerX: number
  centerY: number
}

/** The wording a file check needs; a preset passes its own. */
export type ImageCheckMessages = Pick<typeof imageCropperMessages.defaults, "anyImage" | "notSupported" | "tooLarge" | "unreadable" | "tooSmall" | "maxFileSize" | "minPixels">

/** Zooming past this would show fewer source pixels than any useful crop. */
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
export function describeFormats(accept: string = IMAGE_ACCEPT, locale = getLocale(), messages: Pick<ImageCheckMessages, "anyImage"> = getImageCropperMessages(locale)): string {
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
export function describeImageRequirements(requirements: ImageRequirements = {}, locale = getLocale(), messages: ImageCheckMessages = getImageCropperMessages(locale)): string {
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

/** Decode an image and read its dimensions (EXIF orientation applied). Rejects when it is not an image. */
export async function readImageSize(blob: Blob): Promise<ImageSize> {
  const image = await loadImage(blob)
  return { width: image.naturalWidth, height: image.naturalHeight }
}

/**
 * Check a file against the requirements in order — type, size, whether it decodes, its
 * dimensions, then `validate` — and stop at the first reason to refuse it.
 */
export async function checkImageFile(file: File, requirements: ImageRequirements = {}, locale = getLocale(), messages: ImageCheckMessages = getImageCropperMessages(locale)): Promise<ImageFileCheck> {
  const refuse = (reason: ImageRejectionReason, message: string): ImageFileCheck => ({ ok: false, rejection: { file, reason, message } })
  const accept = requirements.accept ?? IMAGE_ACCEPT
  if (!matchesAccept(file, accept)) return refuse("type", messages.notSupported(file.name, describeFormats(accept, locale, messages)))
  if (requirements.maxSize !== undefined && file.size > requirements.maxSize)
    return refuse("size", messages.tooLarge(file.name, formatBytes(requirements.maxSize, locale)))
  let image: ImageSize
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

/* ── Locked crop: the image moves under a frame of one shape ────────────────── */

/** The largest crop of a shape the image holds, in source pixels: zoom 1. */
export function largestCrop(image: ImageSize, aspect: number): ImageSize {
  const width = Math.min(image.width, image.height * aspect)
  return { width, height: Math.min(image.height, width / aspect) }
}

/** The crop's size in source pixels at a zoom. */
export function cropExtent(image: ImageSize, aspect: number, zoom: number): ImageSize {
  const { width, height } = largestCrop(image, aspect)
  return { width: width / zoom, height: height / zoom }
}

/** The furthest zoom: the crop keeps at least the minimum dimensions of source pixels. */
export function maxCropZoom(image: ImageSize, aspect: number, requirements: Pick<ImageRequirements, "minWidth" | "minHeight"> = {}): number {
  const { width, height } = largestCrop(image, aspect)
  const floor = Math.max(requirements.minWidth ?? 0, 1)
  const floorHeight = Math.max(requirements.minHeight ?? 0, 1)
  return Math.max(1, Math.min(MAX_ZOOM, width / floor, height / floorHeight))
}

/** The view that shows the largest crop, centred. */
export function fitCropView(image: ImageSize): ImageCropView {
  return { zoom: 1, centerX: image.width / 2, centerY: image.height / 2 }
}

/** Keep the zoom in range and the crop inside the image. */
export function clampCropView(view: ImageCropView, image: ImageSize, aspect: number, maxZoom = MAX_ZOOM): ImageCropView {
  const zoom = Math.min(Math.max(view.zoom, 1), Math.max(1, maxZoom))
  const extent = cropExtent(image, aspect, zoom)
  const within = (value: number, half: number, size: number) => Math.min(Math.max(value, half), size - half)
  return { zoom, centerX: within(view.centerX, extent.width / 2, image.width), centerY: within(view.centerY, extent.height / 2, image.height) }
}

/** The crop for a view, in whole source pixels and inside the image. */
export function cropRectFor(view: ImageCropView, image: ImageSize, aspect: number): ImageCropRect {
  const extent = cropExtent(image, aspect, view.zoom)
  const width = Math.max(1, Math.min(Math.round(extent.width), image.width))
  const height = Math.max(1, Math.min(Math.round(extent.height), image.height))
  const x = Math.min(Math.max(Math.round(view.centerX - width / 2), 0), image.width - width)
  const y = Math.min(Math.max(Math.round(view.centerY - height / 2), 0), image.height - height)
  return { x, y, width, height }
}

/** The view that shows a crop; a rectangle of another shape is read by its width. */
export function viewForCrop(crop: ImageCropRect, image: ImageSize, aspect: number): ImageCropView {
  return { zoom: largestCrop(image, aspect).width / crop.width, centerX: crop.x + crop.width / 2, centerY: crop.y + crop.height / 2 }
}

/* ── Free crop: a box of any shape over the whole image ─────────────────────── */

/** Which edges a handle moves: `n`, `e`, `s`, `w` or a corner of two. */
export type ImageCropHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"

const leastSize = ({ minWidth, minHeight }: Pick<ImageRequirements, "minWidth" | "minHeight">, image: ImageSize) => ({
  width: Math.min(Math.max(minWidth ?? 0, 1), image.width),
  height: Math.min(Math.max(minHeight ?? 0, 1), image.height),
})

/** The whole image as a crop. */
export const wholeImage = (image: ImageSize): ImageCropRect => ({ x: 0, y: 0, width: image.width, height: image.height })

/** Keep a free crop at its minimum size and inside the image. */
export function clampCropRect(rect: ImageCropRect, image: ImageSize, requirements: Pick<ImageRequirements, "minWidth" | "minHeight"> = {}): ImageCropRect {
  const least = leastSize(requirements, image)
  const width = Math.min(Math.max(rect.width, least.width), image.width)
  const height = Math.min(Math.max(rect.height, least.height), image.height)
  return { x: Math.min(Math.max(rect.x, 0), image.width - width), y: Math.min(Math.max(rect.y, 0), image.height - height), width, height }
}

/** A free crop in whole pixels. */
export function roundCropRect(rect: ImageCropRect, image: ImageSize): ImageCropRect {
  const width = Math.max(1, Math.min(Math.round(rect.width), image.width))
  const height = Math.max(1, Math.min(Math.round(rect.height), image.height))
  return { x: Math.min(Math.max(Math.round(rect.x), 0), image.width - width), y: Math.min(Math.max(Math.round(rect.y), 0), image.height - height), width, height }
}

/** Move a handle by source pixels: the edges it holds follow, stopping at the image and the minimum size. */
export function resizeCropRect(rect: ImageCropRect, handle: ImageCropHandle, dx: number, dy: number, image: ImageSize, requirements: Pick<ImageRequirements, "minWidth" | "minHeight"> = {}): ImageCropRect {
  const least = leastSize(requirements, image)
  let left = rect.x
  let top = rect.y
  let right = rect.x + rect.width
  let bottom = rect.y + rect.height
  if (handle.includes("w")) left = Math.min(Math.max(left + dx, 0), right - least.width)
  if (handle.includes("e")) right = Math.max(Math.min(right + dx, image.width), left + least.width)
  if (handle.includes("n")) top = Math.min(Math.max(top + dy, 0), bottom - least.height)
  if (handle.includes("s")) bottom = Math.max(Math.min(bottom + dy, image.height), top + least.height)
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/* ── Drawing ────────────────────────────────────────────────────────────────── */

function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas 2D is unavailable.")
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  return { canvas, context }
}

/** The pixel size a crop encodes to: the output's, or the crop's own shape. */
export function outputSize(crop: ImageCropRect, output: Pick<ImageCropOutput, "width" | "height"> = {}): ImageSize {
  const { width, height } = output
  if (width !== undefined && height !== undefined) return { width, height }
  if (width !== undefined) return { width, height: Math.max(1, Math.round((width * crop.height) / crop.width)) }
  if (height !== undefined) return { width: Math.max(1, Math.round((height * crop.width) / crop.height)), height }
  return { width: crop.width, height: crop.height }
}

/**
 * Draw a rectangle of the source at the output size and encode it. Large reductions halve in
 * steps, so browsers that ignore `imageSmoothingQuality` still give a smooth result.
 */
export async function cropToBlob(source: Blob, crop: ImageCropRect, output: ImageCropOutput = {}): Promise<Blob> {
  const { type = "image/webp", quality = 0.9 } = output
  const { width, height } = outputSize(crop, output)
  const image = await loadImage(source)
  let current: CanvasImageSource = image
  let region = crop
  while (region.width / 2 >= width && region.height / 2 >= height) {
    const stepWidth = Math.round(region.width / 2)
    const stepHeight = Math.round(region.height / 2)
    const { canvas, context } = canvasOf(stepWidth, stepHeight)
    context.drawImage(current, region.x, region.y, region.width, region.height, 0, 0, stepWidth, stepHeight)
    current = canvas
    region = { x: 0, y: 0, width: stepWidth, height: stepHeight }
  }
  const { canvas, context } = canvasOf(width, height)
  // JPEG has no transparency: a transparent PNG would otherwise turn black.
  if (type === "image/jpeg") {
    context.fillStyle = "#fff" // tokens:allow encoded image pixels, not a theme colour
    context.fillRect(0, 0, width, height)
  }
  context.drawImage(current, region.x, region.y, region.width, region.height, 0, 0, width, height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The image could not be encoded."))), type, quality),
  )
}
