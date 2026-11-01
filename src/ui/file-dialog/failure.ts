import type { FileProviderError } from "../../file-provider/index.js"
import type { fileDialogMessages } from "./messages.js"

type Messages = typeof fileDialogMessages.defaults

/** A provider's code when `error` carries one. A shape, not a class: classes are lost at a worker boundary. */
export const failureCode = (error: unknown): FileProviderError["code"] | undefined => (error as Partial<FileProviderError> | null | undefined)?.code

/**
 * One sentence for a failure (R2.4). `denied` and `unavailable` carry the provider's own message,
 * which is how a lapsed session reaches the person; the other codes have the dialog's words, and
 * a rejection from the host gives its own message.
 */
export function describeFailure(error: unknown, messages: Messages, fallback = messages.errorFailed): string {
  const message = error instanceof Error ? error.message : ""
  switch (failureCode(error)) {
    case "denied":
      return message || messages.errorDenied
    case "unavailable":
      return message || messages.errorUnavailable
    case "not-found":
      return messages.errorNotFound
    case "changed":
      return messages.errorChanged
    case "too-large":
      return messages.errorTooLarge
    case "unsupported":
      return messages.errorUnsupported
    case "exists":
      return fallback
    default:
      return message || fallback
  }
}

/** The reason a `denied` value gives: its own text, or the default for that action. */
export const deniedReason = (value: true | string | undefined, fallback: string): string | null => (value === undefined ? null : value === true ? fallback : value)

/** Splits a file name at its extension: the name without it, and the dot with what follows. */
export function splitName(name: string): { stem: string; extension: string } {
  const dot = name.lastIndexOf(".")
  return dot > 0 ? { stem: name.slice(0, dot), extension: name.slice(dot) } : { stem: name, extension: "" }
}

/** A free name for a copy: `report (2).pdf`, then `report (3).pdf`. */
export function copyName(name: string, taken: ReadonlySet<string>): string {
  const { stem, extension } = splitName(name)
  const base = stem.replace(/ \(\d+\)$/, "")
  for (let number = 2; ; number += 1) {
    const candidate = `${base} (${number})${extension}`
    if (!taken.has(candidate)) return candidate
  }
}

/** The name with `extension` in place of its own. */
export function withExtension(name: string, extension: string): string {
  return `${splitName(name).stem}${extension.startsWith(".") ? extension : `.${extension}`}`
}
