/**
 * Country flags as SVG, never emoji: Windows draws flag emoji as two letters. The set is
 * country-flag-icons (MIT, 3:2), about 178 KB raw / 47 KB gzipped for all 267 flags, loaded
 * as one chunk the first time any flag renders. Until then (and for a code with no flag) the
 * same box shows a neutral tile, so nothing moves when the flags arrive (R9).
 *
 * The SVGs contain no ids, so inlining many on one page cannot collide.
 */
import { useSyncExternalStore } from "react"
import { cx } from "../../lib/cx.js"

type FlagSet = Readonly<Record<string, string>>

let flags: FlagSet | null = null
let loading: Promise<FlagSet> | null = null
const listeners = new Set<() => void>()

/** Load the flag set (once). Resolves with every flag keyed by ISO code. */
export function loadFlags(): Promise<FlagSet> {
  loading ??= import("country-flag-icons/string/3x2").then((module) => {
    flags = module as unknown as FlagSet
    for (const listener of listeners) listener()
    return flags
  })
  return loading
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  void loadFlags()
  return () => listeners.delete(listener)
}

/** The flag set once loaded (null before); subscribing starts the load. */
export const useFlags = () =>
  useSyncExternalStore(
    subscribe,
    () => flags,
    () => null
  )

export interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 ("AU"). */
  code: string
  className?: string
}

/** A 3:2 flag the height of an icon. Decorative: the country's name or code is always beside it. */
export function CountryFlag({ code, className }: CountryFlagProps) {
  const set = useFlags()
  const svg = set?.[code.toUpperCase()]
  return (
    <span
      className={cx("fa-flag", className)}
      aria-hidden
      data-loaded={svg ? "" : undefined}
      // The set is a trusted package of static SVG markup, not user input.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  )
}
