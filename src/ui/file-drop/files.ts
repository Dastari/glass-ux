/**
 * Pure helpers for FileDrop: byte formatting, accept matching and screening dropped or
 * picked files against the limits. Kept free of React so they are unit-tested.
 */

export type FileRejectionReason = "type" | "size" | "count"

export interface FileRejection {
  /** File name, media type and availability. */
  file: File
  reason: FileRejectionReason
  /** Plain-language reason, ready for the field's message line. */
  message: string
}

export interface FileLimits {
  /** Same syntax as <input accept>: ".msi,.exe,application/zip,image/*". */
  accept?: string
  /** Bytes per file. */
  maxSize?: number
  /** Files allowed in total, counting `existing`. */
  maxFiles?: number
  /** Files already in the list. */
  existing?: number
}

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const
const THIN_SPACE = " "

/** "812 KB", "24.6 MB", "500 MB" — binary units, as Windows shows them (R2.7 thin space). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return `0${THIN_SPACE}B`
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1
  const text = value.toLocaleString("en-AU", { maximumFractionDigits: digits, minimumFractionDigits: 0 })
  return `${text}${THIN_SPACE}${UNITS[unit]}`
}

const acceptTokens = (accept: string | undefined) =>
  (accept ?? "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)

/** Whether a file satisfies an `accept` string (extensions, exact MIME types, or type/*). */
export function matchesAccept(file: Pick<File, "name" | "type">, accept: string | undefined): boolean {
  const tokens = acceptTokens(accept)
  if (tokens.length === 0) return true
  const name = file.name.toLowerCase()
  const type = (file.type || "").toLowerCase()
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token)
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1))
    return type === token
  })
}

/** ".msi, .exe or .zip" */
export function describeAccept(accept: string | undefined): string {
  const tokens = acceptTokens(accept).map((token) => (token.endsWith("/*") ? `${token.slice(0, -2)} files` : token))
  if (tokens.length <= 1) return tokens[0] ?? ""
  return `${tokens.slice(0, -1).join(", ")} or ${tokens.at(-1)}`
}

/** Split files into the ones that fit the limits and the ones that do not, with reasons. */
export function screenFiles(files: File[], limits: FileLimits = {}) {
  const accepted: File[] = []
  const rejected: FileRejection[] = []
  const room = limits.maxFiles === undefined ? Number.POSITIVE_INFINITY : limits.maxFiles - (limits.existing ?? 0)
  for (const file of files) {
    if (!matchesAccept(file, limits.accept)) {
      rejected.push({ file, reason: "type", message: `${file.name} is not a ${describeAccept(limits.accept)} file` })
    } else if (limits.maxSize !== undefined && file.size > limits.maxSize) {
      rejected.push({ file, reason: "size", message: `${file.name} is larger than ${formatBytes(limits.maxSize)}` })
    } else if (accepted.length >= room) {
      rejected.push({
        file,
        reason: "count",
        message: `${file.name} was not added — the limit is ${limits.maxFiles} ${limits.maxFiles === 1 ? "file" : "files"}`,
      })
    } else {
      accepted.push(file)
    }
  }
  return { accepted, rejected }
}

/** One line for the message slot: the first reason, plus how many others were refused. */
export function describeRejections(rejected: FileRejection[]): string | undefined {
  const [first, ...rest] = rejected
  if (!first) return undefined
  return rest.length ? `${first.message} · ${rest.length} more not added` : first.message
}
