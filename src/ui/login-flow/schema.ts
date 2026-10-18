/**
 * Zod schemas for each LoginFlow form, built from the flow's identifier kind, labels and
 * password policy. Messages come from the labels or the typed fields' own parsers.
 */
import { z } from "zod"
import { parseEmail } from "../email-field/index.js"
import { isCompleteOtp, type OtpCharacters } from "../otp-field/index.js"
import { passwordSchema } from "../password-field/index.js"
import type { LoginFlowLabels, LoginIdentifierKind, LoginPasswordPolicy } from "./types.js"

/** The identifier rule for sign-in and reset requests. */
export function loginIdentifierSchema(kind: LoginIdentifierKind, labels: LoginFlowLabels) {
  return z.string().superRefine((value, context) => {
    const text = value.trim()
    if (!text) {
      context.addIssue({ code: "custom", message: labels.identifierRequired(kind) })
      return
    }
    // Either-kind fields only check addresses that look like one.
    if (kind === "email" || (kind === "email-or-username" && text.includes("@"))) {
      const parsed = parseEmail(text)
      if (!parsed.ok) context.addIssue({ code: "custom", message: parsed.error })
    }
  })
}

/** A new password under the host's policy. */
export function newPasswordSchema(policy: LoginPasswordPolicy | undefined) {
  if (typeof policy === "function")
    return z.string().superRefine((value, context) => {
      const message = policy(value)
      if (message) context.addIssue({ code: "custom", message })
    })
  return passwordSchema(policy)
}

/** A complete one-time code. */
export function codeSchema(length: number, characters: OtpCharacters) {
  const message = `Enter the ${length}-${characters === "numeric" ? "digit" : "character"} code`
  return z.string().refine((value) => isCompleteOtp(value, length, characters), message)
}

/** Adds the confirmation rule to a schema whose values have `password` and `confirm`. */
export function confirmsPassword(labels: LoginFlowLabels) {
  return (values: { password: string; confirm?: string }, context: z.RefinementCtx) => {
    if (values.confirm === undefined) return
    if (values.confirm !== values.password) context.addIssue({ code: "custom", path: ["confirm"], message: labels.passwordMismatch })
  }
}
