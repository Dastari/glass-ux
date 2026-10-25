import { getPasswordFieldMessages } from "./messages.js"
import { z } from "zod"
import { estimateStrength, type StrengthScore } from "./strength.js"

export interface PasswordSchemaOptions {
  /** Locale for validation wording. Defaults to getLocale(). */
  locale?: string
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
      if (options.required ?? true) context.addIssue({ code: "custom", message: getPasswordFieldMessages(options.locale).enterAPassword })
      return
    }
    if (value.length < minLength) {
      context.addIssue({ code: "custom", message: getPasswordFieldMessages(options.locale).useCharactersOrMore(minLength) })
      return
    }
    const strength = estimateStrength(value, options.userInputs, getPasswordFieldMessages(options.locale))
    if (strength.score < minScore) context.addIssue({ code: "custom", message: `${strength.label}: ${(strength.feedback ?? getPasswordFieldMessages(options.locale).chooseAStrongerPassword).replace(/^./, (char) => char.toLowerCase())}` })
  })
}

/** The password someone already has (sign-in, confirm before a change): just required. */
export function currentPasswordSchema(locale?: string) {
  return z.string().min(1, { error: () => getPasswordFieldMessages(locale).enterYourPassword })
}
