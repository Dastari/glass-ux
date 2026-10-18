/**
 * Host names and domain names (RFC 1123 labels): validate and normalise what people type or
 * paste. A pasted URL ("https://northstar.example/about") gives its host. Unicode domains are
 * converted to their ASCII (punycode) form by the platform's URL parser, which is what DNS
 * and certificates use.
 */

export type HostnameResult = { ok: true; value: string } | { ok: false; error: string }

export interface HostnameOptions {
  /** Require a fully qualified name with a dot ("printer.northstar.local"). Default false. */
  fqdn?: boolean
  /** Allow a leading "*." wildcard label ("*.northstar.example"). Default false. */
  wildcard?: boolean
  /** "lower" (default for domains) or "preserve" (default for host names: "NST-C106"). */
  case?: "lower" | "preserve"
}

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i
const MAX_LENGTH = 253

/** Strip a scheme, credentials, port, path and a trailing dot from pasted text. */
export function hostOf(text: string): string {
  let source = text.trim()
  const scheme = /^[a-z][a-z0-9+.-]*:\/\//i.exec(source)
  if (scheme) source = source.slice(scheme[0].length)
  source = source.replace(/^[^@/]*@/, "")
  source = source.split(/[/?#]/)[0] ?? ""
  // A port, unless the whole thing is an IPv6 literal.
  if (!source.startsWith("[")) source = source.replace(/:\d+$/, "")
  return source.replace(/\.$/, "")
}

/** ASCII (punycode) form of a host with Unicode labels; the text unchanged when it is ASCII. */
export function toAscii(host: string): string | null {
  // oxlint-disable-next-line no-control-regex -- the printable ASCII range
  if (/^[\x21-\x7e]*$/.test(host)) return host
  try {
    return new URL(`http://${host}`).hostname
  } catch {
    return null
  }
}

function check(text: string, options: HostnameOptions, what: "host" | "domain"): HostnameResult {
  const example = what === "domain" ? "such as northstar.example" : options.fqdn ? "such as printer.northstar.local" : "such as NST-C106 or printer.northstar.local"
  const noun = what === "domain" ? "a domain" : "a host name"
  const host = hostOf(text)
  if (!host) return { ok: false, error: `Enter ${noun}` }
  let ascii = toAscii(host)
  if (ascii === null) return { ok: false, error: `Enter ${noun} ${example}` }
  let prefix = ""
  if (ascii.startsWith("*.")) {
    if (!options.wildcard) return { ok: false, error: `Enter ${noun} without a wildcard` }
    prefix = "*."
    ascii = ascii.slice(2)
  }
  if (ascii.length + prefix.length > MAX_LENGTH) return { ok: false, error: `Use ${MAX_LENGTH} characters or fewer` }
  const labels = ascii.split(".")
  const bad = labels.find((label) => !LABEL.test(label))
  if (bad !== undefined) {
    if (bad === "") return { ok: false, error: `Enter ${noun} ${example}` }
    if (bad.length > 63) return { ok: false, error: "Keep each part between dots to 63 characters" }
    if (bad.startsWith("-") || bad.endsWith("-")) return { ok: false, error: "A part can't start or end with a hyphen" }
    return { ok: false, error: `Use letters, digits and hyphens only, ${example}` }
  }
  const needsDot = what === "domain" || options.fqdn
  if (needsDot && labels.length < 2) return { ok: false, error: `Enter a full ${what === "domain" ? "domain" : "name"} ${example}` }
  // A top-level domain is letters (or an IDN "xn--" label), never all digits.
  if (needsDot && !/^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/i.test(labels.at(-1) ?? "")) return { ok: false, error: `Enter ${noun} ${example}` } // tokens:allow a regular expression, not a class
  const lower = (options.case ?? (what === "domain" ? "lower" : "preserve")) === "lower"
  const value = prefix + (lower ? ascii.toLowerCase() : ascii)
  return { ok: true, value }
}

/** A host name: one label ("NST-C106") or a dotted name ("printer.northstar.local"). */
export const parseHostname = (text: string, options: HostnameOptions = {}) => check(text, options, "host")

/** A domain name with at least two labels and an alphabetic top-level domain. */
export const parseDomain = (text: string, options: Omit<HostnameOptions, "fqdn"> = {}) => check(text, options, "domain")

/** The host name in ASCII (punycode) form, without scheme, path, port or trailing dot, or null when it is not valid. Case is kept unless `options.case` is "lower". */
export function normaliseHostname(text: string, options: HostnameOptions = {}) {
  const result = parseHostname(text, options)
  return result.ok ? result.value : null
}

/** The domain in lower-case ASCII (punycode) form, without scheme, path, port or trailing dot, or null when it is not valid. */
export function normaliseDomain(text: string, options: Omit<HostnameOptions, "fqdn"> = {}) {
  const result = parseDomain(text, options)
  return result.ok ? result.value : null
}

/** NetBIOS (pre-Windows 2000) computer names stop at 15 characters. */
export const NETBIOS_MAX = 15
