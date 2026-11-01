/**
 * Avatar photos: the square, photo-worded preset of the crop helpers in `glass-ux/image-cropper`.
 * They use the browser's Image and canvas only, no React, so an application can call them in
 * its own flows.
 */
import {
  checkImageFile,
  clampCropView,
  cropExtent,
  cropRectFor,
  cropToBlob,
  describeFormats as describeImageFormats,
  describeImageRequirements,
  fitCropView,
  IMAGE_ACCEPT,
  maxCropZoom,
  type ImageCropView,
  type ImageFileCheck,
  type ImageRejection,
  type ImageRejectionReason,
  type ImageRequirements,
  type ImageSize,
} from "../image-cropper/crop.js"
import { getLocale } from "../../lib/locale/locale.js"
import { getAvatarEditorMessages } from "./messages.js"

export { readImageSize } from "../image-cropper/crop.js"

/** The default `accept`: PNG, JPEG or WebP. */
export const AVATAR_ACCEPT = IMAGE_ACCEPT

/** Pixel dimensions of a decoded image, after its EXIF orientation. */
export interface AvatarImageSize extends ImageSize {}

/** What a photo must satisfy before it can be cropped and saved. */
export interface AvatarRequirements extends ImageRequirements {}

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

export type AvatarRejectionReason = ImageRejectionReason

/** A file the dialog refused, with the reason shown on its message line. */
export interface AvatarRejection extends ImageRejection {}

/** The result of `checkAvatarFile`: the decoded size, or why the file was refused. */
export type AvatarFileCheck = ImageFileCheck

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
export interface AvatarView extends ImageCropView {}

/** "PNG, JPEG or WebP" from an accept string; `image/*` reads "any image". */
export function describeFormats(accept: string = AVATAR_ACCEPT, locale = getLocale(), messages = getAvatarEditorMessages(locale)): string {
  return describeImageFormats(accept, locale, messages)
}

/** The limits line under the drop zone: "PNG, JPEG or WebP · Max 5 MB · At least 256 × 256 px". */
export function describeAvatarRequirements(requirements: AvatarRequirements = {}, locale = getLocale(), messages = getAvatarEditorMessages(locale)): string {
  return describeImageRequirements(requirements, locale, messages)
}

/**
 * Check a file against the requirements in order — type, size, whether it decodes, its
 * dimensions, then `validate` — and stop at the first reason to refuse it.
 */
export async function checkAvatarFile(file: File, requirements: AvatarRequirements = {}, locale = getLocale()): Promise<AvatarFileCheck> {
  return checkImageFile(file, requirements, locale, getAvatarEditorMessages(locale))
}

/* ── Crop geometry ──────────────────────────────────────────────────────────── */

/** The furthest zoom: the crop keeps at least the larger minimum dimension of source pixels. */
export function maxZoomFor(image: AvatarImageSize, requirements: Pick<AvatarRequirements, "minWidth" | "minHeight"> = {}): number {
  return maxCropZoom(image, 1, requirements)
}

/** The view that fits the short side, centred. */
export const fitView = fitCropView

/** The crop square's side in source pixels at a zoom. */
export const cropSide = (image: AvatarImageSize, zoom: number) => cropExtent(image, 1, zoom).width

/** Keep the zoom in range and the square inside the image. */
export function clampView(view: AvatarView, image: AvatarImageSize, maxZoom?: number): AvatarView {
  return clampCropView(view, image, 1, maxZoom)
}

/** The crop square for a view, in whole source pixels and inside the image. */
export function cropFor(view: AvatarView, image: AvatarImageSize): AvatarCrop {
  const { x, y, width } = cropRectFor(view, image, 1)
  return { x, y, size: width }
}

/* ── Drawing ────────────────────────────────────────────────────────────────── */

/**
 * Draw a square of the source at the output size and encode it. Large reductions halve in
 * steps, so browsers that ignore `imageSmoothingQuality` still give a smooth result.
 */
export function cropImage(source: Blob, crop: AvatarCrop, output: AvatarOutput = {}): Promise<Blob> {
  const { size = 512, type, quality } = output
  return cropToBlob(source, { x: crop.x, y: crop.y, width: crop.size, height: crop.size }, { width: size, height: size, type, quality })
}
