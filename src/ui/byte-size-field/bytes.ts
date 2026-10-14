/**
 * Sizes in bytes as people write them: "500 MB", "1.5 GiB", "2TB", "750k". Decimal units
 * (kB, MB, GB, TB, PB: powers of 1000, as disks and Windows Explorer's file sizes are sold)
 * and binary units (KiB, MiB, GiB…: powers of 1024, as memory is) are both understood.
 *
 *   parseBytes("1.5 GB") → 1_500_000_000
 *   parseBytes("2 GiB")  → 2_147_483_648
 *   formatBytes(1_500_000_000) → "1.5 GB"
 */

export type ByteBase = "decimal" | "binary"

const DECIMAL = ["B", "kB", "MB", "GB", "TB", "PB"] as const
const BINARY = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"] as const

const UNITS: ReadonlyArray<[RegExp, number]> = [
  [/^(b|byte|bytes)$/i, 1],
  [/^(k|kb|kilobytes?)$/i, 1e3],
  [/^(m|mb|megabytes?)$/i, 1e6],
  [/^(g|gb|gigabytes?)$/i, 1e9],
  [/^(t|tb|terabytes?)$/i, 1e12],
  [/^(p|pb|petabytes?)$/i, 1e15],
  [/^(ki|kib|kibibytes?)$/i, 1024],
  [/^(mi|mib|mebibytes?)$/i, 1024 ** 2],
  [/^(gi|gib|gibibytes?)$/i, 1024 ** 3],
  [/^(ti|tib|tebibytes?)$/i, 1024 ** 4],
  [/^(pi|pib|pebibytes?)$/i, 1024 ** 5],
]

export interface ParseBytesOptions {
  /** The unit of a bare number ("500" → 500 MB with "MB"). Default "B". */
  defaultUnit?: string
}

/** Whole bytes, or null when the text is not a size. */
export function parseBytes(text: string, options: ParseBytesOptions = {}): number | null {
  const match = /^([0-9][0-9,]*(?:\.\d+)?|\.\d+)\s*([a-z]*)$/i.exec(text.trim())
  if (!match) return null
  const amount = Number((match[1] ?? "").replace(/,/g, ""))
  const unit = match[2] || options.defaultUnit || "B"
  const factor = UNITS.find(([pattern]) => pattern.test(unit))?.[1]
  if (factor === undefined || !Number.isFinite(amount)) return null
  return Math.round(amount * factor)
}

export interface FormatBytesOptions {
  /** decimal (default): kB, MB, GB; binary: KiB, MiB, GiB. */
  base?: ByteBase
  /** Significant decimals kept (default 1, dropped when zero: "2 GB", "1.5 GB"). */
  decimals?: number
}

/** "1.5 GB", with a thin space between number and unit (R2.7). */
export function formatBytes(bytes: number, options: FormatBytesOptions = {}): string {
  const binary = options.base === "binary"
  const step = binary ? 1024 : 1000
  const names = binary ? BINARY : DECIMAL
  let value = Math.abs(bytes)
  let index = 0
  while (value >= step && index < names.length - 1) {
    value /= step
    index++
  }
  const decimals = index === 0 ? 0 : (options.decimals ?? 1)
  const text = value.toLocaleString("en-AU", { maximumFractionDigits: decimals })
  return `${bytes < 0 ? "−" : ""}${text} ${names[index]}`
}
