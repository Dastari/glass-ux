import { getMacFieldMessages } from "./messages.js"
/**
 * MAC addresses (EUI-48): accept any separator people paste ("aa:bb:cc:dd:ee:ff",
 * "AA-BB-CC-DD-EE-FF", Cisco "aabb.ccdd.eeff", "aabbccddeeff") and write them one way.
 */

/** How a MAC address is written. colon (default) "AA:BB:CC:DD:EE:FF"; hyphen is Windows; dot is Cisco. */
export type MacFormat = "colon" | "hyphen" | "dot" | "bare"

export interface MacStyle {
  /** Value formatter or formatting options. */
  format?: MacFormat
  /** Default upper case, as Windows and most switches show it. */
  case?: "upper" | "lower"
}

/** The 12 hex digits of a MAC address, upper case, or null when it is not one. */
export function macDigits(text: string): string | null {
  const source = text.trim()
  if (!source) return null
  // Groups of 2 with : - or space, groups of 4 with dots, or 12 digits in a row.
  const patterns = [
    /^([0-9a-f]{1,2})([:\- ])([0-9a-f]{1,2})\2([0-9a-f]{1,2})\2([0-9a-f]{1,2})\2([0-9a-f]{1,2})\2([0-9a-f]{1,2})$/i,
    /^([0-9a-f]{4})\.([0-9a-f]{4})\.([0-9a-f]{4})$/i,
    /^([0-9a-f]{12})$/i,
  ]
  const groups = patterns[0]!.exec(source)
  if (groups) {
    return [groups[1], groups[3], groups[4], groups[5], groups[6], groups[7]].map((group) => (group ?? "").padStart(2, "0")).join("").toUpperCase()
  }
  const cisco = patterns[1]!.exec(source)
  if (cisco) return `${cisco[1]}${cisco[2]}${cisco[3]}`.toUpperCase()
  const bare = patterns[2]!.exec(source)
  return bare ? (bare[1] ?? "").toUpperCase() : null
}

/** Write 12 hex digits in a format. */
export function formatMac(digits: string, style: MacStyle = {}): string {
  const format = style.format ?? "colon"
  const text = style.case === "lower" ? digits.toLowerCase() : digits.toUpperCase()
  const pairs = text.match(/.{2}/g) ?? []
  if (format === "colon") return pairs.join(":")
  if (format === "hyphen") return pairs.join("-")
  if (format === "dot") return (text.match(/.{4}/g) ?? []).join(".")
  return text
}

/** Normalise typed or pasted text; null when it is not a MAC address. */
export function normaliseMac(text: string, style: MacStyle = {}): string | null {
  const digits = macDigits(text)
  return digits ? formatMac(digits, style) : null
}

/** The organisationally unique identifier (vendor prefix): the first 6 hex digits, "AABBCC". */
export const ouiOf = (digits: string) => digits.slice(0, 6).toUpperCase()

export interface MacFacts {
  /** The second hex digit's 0x2 bit: set by the device, not the vendor (randomised Wi-Fi addresses). */
  locallyAdministered: boolean
  /** The first octet's 0x1 bit: a group address, not one device. */
  multicast: boolean
  broadcast: boolean
}

/** Reads the address bits of a MAC given as 12 hex digits: locally administered, multicast and broadcast. */
export function macFacts(digits: string): MacFacts {
  const first = Number.parseInt(digits.slice(0, 2), 16)
  return {
    locallyAdministered: (first & 0x02) !== 0,
    multicast: (first & 0x01) !== 0,
    broadcast: digits.toUpperCase() === "FFFFFFFFFFFF",
  }
}

/** A quiet hint for addresses whose vendor lookup cannot help. */
export function describeMac(digits: string, messages: ReturnType<typeof getMacFieldMessages> = getMacFieldMessages()): string | null {
  const facts = macFacts(digits)
  if (facts.broadcast) return messages.broadcastAddress
  if (facts.multicast) return messages.multicastAddress
  if (facts.locallyAdministered) return messages.locallyAdministeredOftenARandomisedWiFiAddress
  return null
}
