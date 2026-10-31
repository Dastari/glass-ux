import { getLocale } from "../../lib/locale/locale.js"
import { getUrlFieldMessages } from "./messages.js"
import { listFormat } from "../../lib/locale/intl.js"
/**
 * Web addresses: add the scheme people leave off, refuse schemes that are not links
 * (javascript:, data:), and write the URL the way the platform parser does (lower-case scheme
 * and host, punycode for Unicode hosts, default ports dropped).
 *
 *   parseUrl("northstar.example/portal") → https://northstar.example/portal
 *   parseUrl("HTTP://Printer.local:80/") → http://printer.local
 */

export type UrlResult = { ok: true; value: string; addedScheme: boolean } | { ok: false; error: string }

export interface UrlOptions {
  /** Locale for validation wording. Defaults to getLocale(). */
  locale?: string
  /** Schemes accepted, without the colon. Default ["https", "http"]. */
  schemes?: readonly string[]
  /** Added when the text has none. Default "https". */
  defaultScheme?: string
  /** Require a host with a dot or "localhost" (default true): rejects "https://intranet". */
  requireTld?: boolean
}

const SCHEME = /^([a-z][a-z0-9+.-]*):/i

/** Validate and normalise. A bare origin loses its trailing slash ("https://northstar.example"). */
export function parseUrl(text: string, options: UrlOptions = {}): UrlResult {
  const schemes = (options.schemes ?? ["https", "http"]).map((scheme) => scheme.toLowerCase())
  const example = `${schemes[0] ?? "https"}://northstar.example`
  let source = text.trim()
  if (!source) return { ok: false, error: getUrlFieldMessages(options.locale).enterAWebAddress }
  let addedScheme = false
  const scheme = SCHEME.exec(source)
  // "localhost:8080" and "printer.local:631" read as scheme:rest; a scheme never starts with a digit after it.
  const looksLikeHostPort = scheme && /^[a-z0-9.-]+:\d+/i.test(source)
  if (!scheme || looksLikeHostPort) {
    source = `${options.defaultScheme ?? schemes[0] ?? "https"}://${source.replace(/^\/\//, "")}`
    addedScheme = true
  }
  const given = (SCHEME.exec(source)?.[1] ?? "").toLowerCase()
  if (!schemes.includes(given)) {
    return { ok: false, error: schemes.length === 1 ? getUrlFieldMessages(options.locale).startTheAddressWith(schemes[0]) : getUrlFieldMessages(options.locale).useAnAddressThatStartsWith(listFormat(options.locale ?? getLocale(), { type: "disjunction" }).format(schemes.map((entry) => `${entry}://`))) }
  }
  let url: URL
  try {
    url = new URL(source)
  } catch {
    return { ok: false, error: getUrlFieldMessages(options.locale).invalidUrlExample(example) }
  }
  if (!url.hostname) return { ok: false, error: getUrlFieldMessages(options.locale).invalidUrlExample(example) }
  const host = url.hostname.replace(/^\[|\]$/g, "")
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")
  if ((options.requireTld ?? true) && !isIp && host !== "localhost" && !host.includes(".")) {
    return { ok: false, error: getUrlFieldMessages(options.locale).enterAFullAddress(example) }
  }
  let value = url.href
  if (url.pathname === "/" && !url.search && !url.hash) value = value.replace(/\/$/, "")
  return { ok: true, value, addedScheme }
}

/** The canonical URL (scheme added when missing, trailing slash dropped from a bare host), or null when it is not a valid web address. */
export function normaliseUrl(text: string, options: UrlOptions = {}): string | null {
  const result = parseUrl(text, options)
  return result.ok ? result.value : null
}

/** True for a URL sent in the clear. */
export const isInsecure = (value: string) => /^http:\/\//i.test(value)
