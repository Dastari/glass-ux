import { getEmailFieldMessages } from "./messages.js"
/**
 * Email addresses: a practical check (what mail systems accept, not the full RFC 5322 grammar),
 * normalisation, and a typo hint for the domain ("avery@gmial.com" → "Did you mean gmail.com?").
 */

export type EmailResult = { ok: true; value: string } | { ok: false; error: string }

const LOCAL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]{1,64}$/
const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i

/** The sample address quoted in validation messages and used as a placeholder. */
export const EMAIL_EXAMPLE = "name@example.com.au"

/** Validate and normalise: trimmed, the domain in lower case (the local part keeps its case). */
export function parseEmail(text: string, locale?: string): EmailResult {
  const source = text.trim().replace(/^mailto:/i, "")
  if (!source) return { ok: false, error: getEmailFieldMessages(locale).enterAnEmailAddress }
  const at = source.lastIndexOf("@")
  if (at < 1 || at === source.length - 1) return { ok: false, error: getEmailFieldMessages(locale).enterAnEmailSuchAs(EMAIL_EXAMPLE) }
  const local = source.slice(0, at)
  const domain = source.slice(at + 1).toLowerCase().replace(/\.$/, "")
  if (!LOCAL.test(local) || local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return { ok: false, error: getEmailFieldMessages(locale).enterAnEmailSuchAs(EMAIL_EXAMPLE) }
  }
  const labels = domain.split(".")
  if (labels.length < 2 || labels.some((label) => !LABEL.test(label)) || !/^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/.test(labels.at(-1) ?? "")) { // tokens:allow a regular expression, not a class
    return { ok: false, error: getEmailFieldMessages(locale).enterAnEmailSuchAs(EMAIL_EXAMPLE) }
  }
  if (source.length > 254) return { ok: false, error: getEmailFieldMessages(locale).emailTooLong }
  return { ok: true, value: `${local}@${domain}` }
}

/** The address trimmed with its domain in lower case and any `mailto:` removed, or null when it is not a valid email. */
export function normaliseEmail(text: string): string | null {
  const result = parseEmail(text)
  return result.ok ? result.value : null
}

/** Mail domains people mistype most, Australian providers included. */
export const COMMON_EMAIL_DOMAINS: readonly string[] = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.com.au",
  "hotmail.com",
  "hotmail.com.au",
  "live.com",
  "live.com.au",
  "msn.com",
  "yahoo.com",
  "yahoo.com.au",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "bigpond.com",
  "bigpond.net.au",
  "optusnet.com.au",
  "tpg.com.au",
  "iinet.net.au",
  "internode.on.net",
  "westnet.com.au",
  "dodo.com.au",
  "xtra.co.nz",
]

/** Top-level domains people mistype. */
const TLD_FIXES: ReadonlyArray<[RegExp, string]> = [
  [/\.(con|cmo|ocm|vom|xom|comm|coom|cm|om)$/, ".com"],
  [/\.(nte|ent|nett|ner)$/, ".net"],
  [/\.(rog|ogr|orgg)$/, ".org"],
  [/\.com\.(a|ua|aus)$/, ".com.au"],
  [/\.net\.(a|ua)$/, ".net.au"],
  [/\.gov\.(a|ua)$/, ".gov.au"],
  [/\.edu\.(a|ua)$/, ".edu.au"],
]

/** Optimal string alignment distance (Damerau–Levenshtein with adjacent swaps). */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const d: number[][] = Array.from({ length: rows }, (_row, i) => Array.from({ length: cols }, (_col, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) best = Math.min(best, d[i - 2]![j - 2]! + 1)
      d[i]![j] = best
    }
  }
  return d[a.length]![b.length]!
}

/**
 * A likely intended address when the domain looks like a typo of a known one, or null. Known
 * domains are the common providers plus any passed in (the organisation's own,
 * "northstar.example"), which win ties.
 */
export function suggestEmail(text: string, known: readonly string[] = []): string | null {
  const parsed = parseEmail(text)
  const source = parsed.ok ? parsed.value : text.trim()
  const at = source.lastIndexOf("@")
  if (at < 1) return null
  const local = source.slice(0, at)
  const domain = source.slice(at + 1).toLowerCase()
  if (!domain) return null
  const candidates = [...known.map((entry) => entry.toLowerCase()), ...COMMON_EMAIL_DOMAINS]
  if (candidates.includes(domain)) return null
  let best: { domain: string; distance: number } | null = null
  for (const candidate of candidates) {
    // Allow one edit for short domains and two for longer ones; never suggest a wholly different name.
    const allowed = candidate.length <= 8 ? 1 : 2
    const distance = editDistance(domain, candidate)
    if (distance > 0 && distance <= allowed && (!best || distance < best.distance)) best = { domain: candidate, distance }
  }
  if (best) return `${local}@${best.domain}`
  for (const [pattern, fix] of TLD_FIXES) {
    if (pattern.test(domain)) return `${local}@${domain.replace(pattern, fix)}`
  }
  return null
}
