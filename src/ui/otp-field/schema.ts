import { getOtpFieldMessages } from "./messages.js"
import { z } from "zod"
import { isCompleteOtp, type OtpCharacters } from "./otp.js"

/**
 * A complete one-time code:
 *
 *   otpSchema()                                  → "Enter the 6-digit code"
 *   otpSchema({ length: 8, characters: "alphanumeric" }) → "Enter the 8-character code"
 */
export function otpSchema(options: { /** Locale for validation wording. Defaults to getLocale(). */ locale?: string; length?: number; characters?: OtpCharacters } = {}) {
  const length = options.length ?? 6
  const characters = options.characters ?? "numeric"
  const message = () => { const messages: ReturnType<typeof getOtpFieldMessages> = getOtpFieldMessages(options.locale); return messages.enterTheCode(length, characters === "numeric" ? messages.digit : messages.character) }
  return z.string().refine((value) => isCompleteOtp(value, length, characters), { error: message })
}
