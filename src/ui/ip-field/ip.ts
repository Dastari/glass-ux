/**
 * IP addresses and CIDR prefixes: parse what people type or paste, normalise it, and describe
 * a range. Pure functions, shared by IpInput and its schema helper.
 *
 *   parseIp("010.1.2.003")          → 10.1.2.3 (IPv4 drops leading zeros)
 *   parseIp("2001:DB8:0:0::1")      → 2001:db8::1 (RFC 5952: lower case, longest zero run as ::)
 *   parseIp("[fe80::1]")            → fe80::1 (brackets from a URL are dropped)
 *   parseIp("192.168.1.10/24", { cidr: "required" }) → 192.168.1.10/24, network 192.168.1.0/24
 */
import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

export type IpVersion = 4 | 6

/** Whether a prefix length (/24) is not allowed, allowed or required. */
export type CidrMode = "none" | "optional" | "required"

export interface IpOptions {
  /** Accept IPv4, IPv6 or either (default). */
  version?: IpVersion | "any"
  /** A prefix length: "none" (default), "optional" or "required". */
  cidr?: CidrMode
}

export interface ParsedIp {
  version: IpVersion
  /** The address in canonical form, without the prefix. */
  address: string
  /** The prefix length, or null for a single address. */
  prefix: number | null
  /** The address's bytes (4 or 16). */
  bytes: number[]
}

export type IpResult = { ok: true; value: ParsedIp } | { ok: false; error: string }

const EXAMPLE: Record<IpVersion | "any", string> = {
  4: "such as 192.168.1.10",
  6: "such as 2001:db8::1",
  any: "such as 192.168.1.10 or 2001:db8::1",
}

const kind = (version: IpVersion | "any") => (version === 4 ? "an IPv4 address" : version === 6 ? "an IPv6 address" : "an IP address")

/** IPv4 dotted decimal → 4 bytes, or null. Leading zeros are read as decimal. */
export function parseIpv4(text: string): number[] | null {
  const parts = text.split(".")
  if (parts.length !== 4) return null
  const bytes: number[] = []
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const value = Number(part)
    if (value > 255) return null
    bytes.push(value)
  }
  return bytes
}

/** IPv6 (full, compressed or with an embedded IPv4 tail) → 16 bytes, or null. */
export function parseIpv6(text: string): number[] | null {
  let source = text
  // A zone id ("fe80::1%eth0") names an interface on this host; it is not part of the address.
  const zone = source.indexOf("%")
  if (zone !== -1) source = source.slice(0, zone)
  if (!/^[0-9a-fA-F:.]+$/.test(source)) return null
  let tail: number[] = []
  const lastColon = source.lastIndexOf(":")
  if (source.includes(".")) {
    const v4 = parseIpv4(source.slice(lastColon + 1))
    if (!v4) return null
    tail = v4
    source = `${source.slice(0, lastColon + 1)}0:0`
  }
  const halves = source.split("::")
  if (halves.length > 2) return null
  const groupsOf = (part: string) => (part === "" ? [] : part.split(":"))
  const head = groupsOf(halves[0] ?? "")
  const rest = halves.length === 2 ? groupsOf(halves[1] ?? "") : []
  const total = head.length + rest.length
  if (halves.length === 1 && total !== 8) return null
  if (halves.length === 2 && total > 7) return null
  const groups = [...head, ...Array.from({ length: 8 - total }, () => "0"), ...rest]
  const bytes: number[] = []
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null
    const value = Number.parseInt(group, 16)
    bytes.push(value >> 8, value & 0xff)
  }
  if (tail.length) bytes.splice(12, 4, ...tail)
  return bytes
}

export function formatIpv4(bytes: readonly number[]) {
  return bytes.slice(0, 4).join(".")
}

/** RFC 5952 text: lower case, no leading zeros, the longest run of 2+ zero groups as "::". */
export function formatIpv6(bytes: readonly number[]) {
  const groups = Array.from({ length: 8 }, (_, index) => ((bytes[index * 2] ?? 0) << 8) | (bytes[index * 2 + 1] ?? 0))
  // IPv4-mapped (::ffff:a.b.c.d) keeps its dotted tail (RFC 5952 §5).
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) return `::ffff:${formatIpv4(bytes.slice(12))}`
  let bestStart = -1
  let bestLength = 0
  for (let index = 0; index < 8; ) {
    if (groups[index] !== 0) {
      index++
      continue
    }
    let end = index
    while (end < 8 && groups[end] === 0) end++
    if (end - index > bestLength) {
      bestStart = index
      bestLength = end - index
    }
    index = end
  }
  const hex = groups.map((group) => group.toString(16))
  if (bestLength < 2) return hex.join(":")
  return `${hex.slice(0, bestStart).join(":")}::${hex.slice(bestStart + bestLength).join(":")}`
}

/** Parse an address, with or without a prefix, into canonical form. */
export function parseIp(text: string, options: IpOptions = {}): IpResult {
  const version = options.version ?? "any"
  const cidr = options.cidr ?? "none"
  let source = text.trim()
  if (!source) return { ok: false, error: `Enter ${kind(version)}` }
  // "[2001:db8::1]" from a URL, or with a port ("[::1]:8080" is not an address; reject the port).
  if (source.startsWith("[")) {
    const close = source.indexOf("]")
    if (close === -1) return { ok: false, error: `Enter ${kind(version)} ${EXAMPLE[version]}` }
    source = source.slice(1, close) + source.slice(close + 1)
  }
  let prefix: number | null = null
  const slash = source.indexOf("/")
  if (slash !== -1) {
    const length = source.slice(slash + 1).trim()
    source = source.slice(0, slash).trim()
    if (cidr === "none") return { ok: false, error: `Enter one address, without a prefix length` }
    if (!/^\d{1,3}$/.test(length)) return { ok: false, error: "Enter a prefix length after the /, such as /24" }
    prefix = Number(length)
  } else if (cidr === "required") {
    return { ok: false, error: version === 6 ? "Add a prefix length, such as /64" : "Add a prefix length, such as /24" }
  }
  const v4 = version !== 6 ? parseIpv4(source) : null
  const v6 = !v4 && version !== 4 ? parseIpv6(source) : null
  const bytes = v4 ?? v6
  if (!bytes) {
    if (version === 4 && parseIpv6(source)) return { ok: false, error: `Enter an IPv4 address ${EXAMPLE[4]}` }
    if (version === 6 && parseIpv4(source)) return { ok: false, error: `Enter an IPv6 address ${EXAMPLE[6]}` }
    return { ok: false, error: `Enter ${kind(version)} ${EXAMPLE[version]}` }
  }
  const resolved: IpVersion = v4 ? 4 : 6
  const maxPrefix = resolved === 4 ? 32 : 128
  if (prefix !== null && prefix > maxPrefix) return { ok: false, error: `Enter a prefix length from 0 to ${maxPrefix}` }
  return { ok: true, value: { version: resolved, address: resolved === 4 ? formatIpv4(bytes) : formatIpv6(bytes), prefix, bytes } }
}

/** The canonical text of a parsed address ("10.1.2.3", "10.1.0.0/16"). */
export function formatIp(ip: ParsedIp) {
  return ip.prefix === null ? ip.address : `${ip.address}/${ip.prefix}`
}

/** Normalise typed or pasted text; null when it is not an address the options allow. */
export function normaliseIp(text: string, options: IpOptions = {}): string | null {
  const result = parseIp(text, options)
  return result.ok ? formatIp(result.value) : null
}

/** The network a prefix describes: host bits cleared ("192.168.1.10/24" → 192.168.1.0/24). */
export function networkOf(ip: ParsedIp): ParsedIp {
  if (ip.prefix === null) return ip
  const bytes = ip.bytes.map((byte, index) => {
    const bits = Math.max(0, Math.min(8, (ip.prefix ?? 0) - index * 8))
    const mask = bits === 0 ? 0 : (0xff << (8 - bits)) & 0xff
    return byte & mask
  })
  return { ...ip, bytes, address: ip.version === 4 ? formatIpv4(bytes) : formatIpv6(bytes) }
}

/** True when the prefix names its network exactly (no host bits set). */
export const isNetworkAddress = (ip: ParsedIp) => ip.prefix === null || networkOf(ip).address === ip.address

/**
 * What an IPv4 prefix covers, for the hint: "254 hosts · 192.168.1.1–192.168.1.254".
 * IPv6 prefixes give their size ("/64 · 18,446,744,073,709,551,616 addresses" is not
 * useful), so only the network is named.
 */
export function describeRange(ip: ParsedIp, locale = getLocale()): string | null {
  if (ip.prefix === null) return null
  const network = networkOf(ip)
  if (ip.version === 6) return `Network ${network.address}/${ip.prefix}`
  const prefix = ip.prefix
  const size = 2 ** (32 - prefix)
  const start = network.bytes.reduce((sum, byte) => sum * 256 + byte, 0)
  const toText = (value: number) => [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join(".")
  if (prefix === 32) return "1 host"
  if (prefix === 31) return `2 hosts · ${toText(start)}–${toText(start + 1)}`
  const hosts = size - 2
  return `${numberFormat(locale).format(hosts)} hosts · ${toText(start + 1)}–${toText(start + size - 2)}`
}

/** Private, loopback, link-local and other special ranges, for a quiet hint. */
export function scopeOf(ip: ParsedIp): string | null {
  const [a = 0, b = 0] = ip.bytes
  if (ip.version === 4) {
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "Private"
    if (a === 127) return "Loopback"
    if (a === 169 && b === 254) return "Link-local"
    if (a === 100 && b >= 64 && b <= 127) return "Carrier-grade NAT"
    if (a >= 224 && a <= 239) return "Multicast"
    return null
  }
  if (ip.bytes.every((byte, index) => byte === (index === 15 ? 1 : 0))) return "Loopback"
  if (a === 0xfe && (b & 0xc0) === 0x80) return "Link-local"
  if ((a & 0xfe) === 0xfc) return "Unique local"
  if (a === 0xff) return "Multicast"
  return null
}
