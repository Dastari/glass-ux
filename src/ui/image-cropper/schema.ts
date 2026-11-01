import { z } from "zod"
import { getImageCropperMessages } from "./messages.js"
import type { ImageFieldValue } from "./image-field.js"

const isImageValue = (value: unknown): value is ImageFieldValue =>
  value === null || typeof value === "string" || (typeof value === "object" && (value as { blob?: unknown }).blob instanceof Blob)

/**
 * An ImageField value: a URL, a new crop, or null when not required:
 *
 *   imageSchema({ required: true }) → "Add an image"
 */
export function imageSchema(options: { /** Locale for validation wording. Defaults to getLocale(). */ locale?: string; required?: boolean } = {}) {
  const message = () => getImageCropperMessages(options.locale).imageRequired
  return z.custom<ImageFieldValue>((value) => isImageValue(value), { error: message }).refine((value) => !options.required || (value !== null && value !== ""), { error: message })
}
