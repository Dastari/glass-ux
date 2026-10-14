import { z } from "zod"
import { isCompleteOtp, type OtpCharacters } from "./otp.js"

/**
 * A complete one-time code:
 *
 *   otpSchema()                                  → "Enter the 6-digit code"
 *   otpSchema({ length: 8, characters: "alphanumeric" }) → "Enter the 8-character code"
 */
export function otpSchema(options: { length?: number; characters?: OtpCharacters } = {}) {
  const length = options.length ?? 6
  const characters = options.characters ?? "numeric"
  const message = `Enter the ${length}-${characters === "numeric" ? "digit" : "character"} code`
  return z.string().refine((value) => isCompleteOtp(value, length, characters), message)
}
