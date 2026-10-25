import { getFormMessages } from "./messages.js"
/**
 * Building blocks for the controls' Zod schema helpers (phoneSchema, ipSchema…): one rule
 * for a text value checked by the control's own parser, and one for a nullable number, so
 * every helper treats "empty" and "required" the same way and its messages come from the
 * parser the control normalises with.
 */
import { z } from "zod"

const messageText = (value: string | (() => string)) => typeof value === "function" ? value() : value

export type Check = { ok: true } | { ok: false; error: string }

export interface RuleOptions {
  /** Empty is an error ("Enter a phone number"); otherwise empty is allowed. Default false. */
  required?: boolean
  /** The message when required and empty. */
  requiredMessage?: string | (() => string)
}

/** A string that is empty (when allowed) or passes `check`. */
export function textRule(check: (value: string) => Check, options: RuleOptions & { requiredMessage: string | (() => string) }) {
  return z.string().superRefine((value, context) => {
    if (!value.trim()) {
      if (options.required) context.addIssue({ code: "custom", message: messageText(options.requiredMessage) })
      return
    }
    const result = check(value)
    if (!result.ok) context.addIssue({ code: "custom", message: result.error })
  })
}

/**
 * A number or null: null only when not required; otherwise within bounds. NaN is what a
 * text-entry number control (DurationInput, ByteSizeInput) holds while its text cannot be
 * read, so it gets `invalidMessage` rather than the required one. `rangeMessage` may be a
 * function, so a message with formatted numbers is written in the locale current when a value
 * is checked rather than when the schema is created.
 */
export function numberRule(
  options: RuleOptions & { requiredMessage: string | (() => string); invalidMessage?: string | (() => string); min?: number; max?: number; integer?: boolean; rangeMessage: string | (() => string) }
) {
  const range = () => (typeof options.rangeMessage === "function" ? options.rangeMessage() : options.rangeMessage)
  return z
    .custom<number | null>((value) => value === null || typeof value === "number", { error: () => messageText(options.requiredMessage) })
    .superRefine((value, context) => {
      if (value === null) {
        if (options.required) context.addIssue({ code: "custom", message: messageText(options.requiredMessage) })
        return
      }
      if (Number.isNaN(value)) {
        context.addIssue({ code: "custom", message: options.invalidMessage ? messageText(options.invalidMessage) : range() })
        return
      }
      const outside = (options.min !== undefined && value < options.min) || (options.max !== undefined && value > options.max)
      if (outside || (options.integer && !Number.isInteger(value))) context.addIssue({ code: "custom", message: range() })
    })
}

/** Adapt a parser's result ({ ok, value } | { ok: false, error }) to a Check. */
export const asCheck = (result: { ok: boolean; error?: string }): Check => (result.ok ? { ok: true } : { ok: false, error: result.error ?? getFormMessages().checkThisValue })
