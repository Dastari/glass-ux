import { z } from "zod"
import { estimateStrength, STRENGTH_LABELS, type StrengthScore } from "./strength.js"

export interface PasswordSchemaOptions {
  /** Default 12. */
  minLength?: number
  /** The weakest score accepted (0 too weak … 4 strong). Default 2 (fair). */
  minScore?: StrengthScore
  /** The person's details, penalised like PasswordInput does. */
  userInputs?: readonly string[]
  required?: boolean
}

/**
 * A new password: long enough and at least `minScore` strong. The server enforces the real
 * policy; this stops obviously weak choices before a round trip.
 *
 *   passwordSchema()                       → "Use 12 characters or more", "Too weak: avoid common passwords…"
 *   passwordSchema({ minLength: 16, minScore: 3 })
 */
export function passwordSchema(options: PasswordSchemaOptions = {}) {
  const minLength = options.minLength ?? 12
  const minScore = options.minScore ?? 2
  return z.string().superRefine((value, context) => {
    if (!value) {
      if (options.required ?? true) context.addIssue({ code: "custom", message: "Enter a password" })
      return
    }
    if (value.length < minLength) {
      context.addIssue({ code: "custom", message: `Use ${minLength} characters or more` })
      return
    }
    const strength = estimateStrength(value, options.userInputs)
    if (strength.score < minScore) context.addIssue({ code: "custom", message: `${STRENGTH_LABELS[strength.score]}: ${(strength.feedback ?? "choose a stronger password").replace(/^./, (char) => char.toLowerCase())}` })
  })
}

/** The password someone already has (sign-in, confirm before a change): just required. */
export function currentPasswordSchema() {
  return z.string().min(1, "Enter your password")
}
