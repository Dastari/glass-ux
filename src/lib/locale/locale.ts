/**
 * The formatting locale: which BCP 47 tag numbers, dates, times, names and sorting follow.
 *
 * Resolution, first match wins:
 * 1. a component's own `locale` prop;
 * 2. the nearest `LocaleProvider`;
 * 3. the application setting from `configureLocale()`;
 * 4. the page's `<html lang>` attribute, when it is a valid BCP 47 tag (browser only);
 * 5. `en-US` (`FALLBACK_LOCALE`).
 *
 * Steps 3–5 are `getLocale()`, for code outside React. Components resolve all five with
 * `useLocale()`. An invalid tag at any step is skipped, except in `configureLocale`, which
 * throws so a misconfigured application fails at start-up.
 */

/** The locale used when nothing else names one: no prop, provider, configuration or valid `<html lang>`. */
export const FALLBACK_LOCALE = "en-US"

const canonical = new Map<string, string | null>()

/**
 * The canonical form of a BCP 47 tag ("en-au" → "en-AU"), or `undefined` when the value is
 * empty or not a tag `Intl` accepts. Results are cached, so calling it on every render is cheap.
 */
export function canonicalLocale(tag: string | null | undefined): string | undefined {
  if (!tag) return undefined
  let known = canonical.get(tag)
  if (known === undefined) {
    try {
      known = Intl.getCanonicalLocales(tag)[0] ?? null
    } catch {
      known = null
    }
    canonical.set(tag, known)
  }
  return known ?? undefined
}

let configured: string | undefined
const listeners = new Set<() => void>()

/**
 * Set the application's formatting locale, used wherever no component prop or
 * `LocaleProvider` names one. Call it once at start-up, beside `configureAppearance`; pass
 * `undefined` to clear it so the page's `<html lang>` applies again. Mounted components
 * that read the locale re-render with the new value.
 *
 * @throws RangeError when `locale` is not a valid BCP 47 tag.
 */
export function configureLocale(locale: string | undefined): void {
  const next = locale === undefined ? undefined : canonicalLocale(locale)
  if (locale !== undefined && !next) throw new RangeError(`configureLocale: "${locale}" is not a valid BCP 47 language tag`)
  if (next === configured) return
  configured = next
  for (const notify of listeners) notify()
}

/** The locale last set with `configureLocale`, or `undefined` when none is configured. */
export function configuredLocale(): string | undefined {
  return configured
}

/**
 * The page's `<html lang>` as a canonical tag, or `undefined` on the server, when the
 * attribute is missing or when it is not a valid BCP 47 tag.
 */
export function documentLocale(): string | undefined {
  if (typeof document === "undefined") return undefined
  return canonicalLocale(document.documentElement?.lang)
}

/**
 * The application locale outside React: `configureLocale()`, then a valid `<html lang>`,
 * then `en-US`. Pure formatting helpers use it as their default `locale` argument; inside
 * React, prefer `useLocale()`, which also honours `LocaleProvider` and follows changes.
 */
export function getLocale(): string {
  return configured ?? documentLocale() ?? FALLBACK_LOCALE
}

/** The application locale the server renders with: `configureLocale()` or `en-US` (no document to read). */
export function serverLocale(): string {
  return configured ?? FALLBACK_LOCALE
}

let observer: MutationObserver | undefined

/**
 * Subscribe to changes of the application locale: `configureLocale` calls and, in the
 * browser, edits to `<html lang>`. Returns the unsubscribe function. `useLocale` uses this;
 * call it directly only to re-run non-React formatting when the locale changes.
 */
export function subscribeLocale(notify: () => void): () => void {
  listeners.add(notify)
  if (!observer && typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
    observer = new MutationObserver(() => {
      for (const listener of listeners) listener()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] })
  }
  return () => {
    listeners.delete(notify)
    if (!listeners.size) {
      observer?.disconnect()
      observer = undefined
    }
  }
}
