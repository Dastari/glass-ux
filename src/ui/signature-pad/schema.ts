import { z } from "zod"
import { isSignatureEmpty, type SignatureValue } from "./ink.js"
import { getSignaturePadMessages } from "./messages.js"

const isSignatureValue = (value: unknown): value is SignatureValue =>
  typeof value === "object" &&
  value !== null &&
  (((value as SignatureValue).kind === "typed" && typeof (value as { text?: unknown }).text === "string") ||
    ((value as SignatureValue).kind === "drawn" && Array.isArray((value as { strokes?: unknown }).strokes)))

/**
 * A signature value, or null when not required:
 *
 *   signatureSchema({ required: true }) → "Add your signature"
 */
export function signatureSchema(options: { /** Locale for validation wording. Defaults to getLocale(). */ locale?: string; required?: boolean } = {}) {
  const message = () => getSignaturePadMessages(options.locale).signatureRequired
  return z
    .custom<SignatureValue | null>((value) => value === null || isSignatureValue(value), { error: message })
    .refine((value) => !options.required || !isSignatureEmpty(value), { error: message })
}
