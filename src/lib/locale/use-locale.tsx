import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react"
import { canonicalLocale, getLocale, serverLocale, subscribeLocale } from "./locale.js"

const LocaleContext = /* @__PURE__ */ createContext<string | undefined>(undefined)

/** Props for LocaleProvider. */
export interface LocaleProviderProps {
  /**
   * BCP 47 tag ("en-AU", "de-CH") for every component inside. An invalid tag is ignored,
   * so the enclosing provider, `configureLocale()` or `<html lang>` applies instead.
   */
  locale: string
  /** The components that format with this locale. */
  children?: ReactNode
}

/**
 * Sets the formatting locale for the components inside it: numbers, money, byte sizes,
 * dates, times, names and sorting. Nested providers override outer ones, so one region can
 * format differently from the rest of the application. A component's own `locale` prop
 * still wins. Without any provider, components follow `configureLocale()`, then the page's
 * `<html lang>`, then `en-US`.
 */
export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  const outer = useContext(LocaleContext)
  const value = canonicalLocale(locale) ?? outer
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

/**
 * The formatting locale for this component: `locale` when it is a valid tag (pass the
 * component's own `locale` prop), then the nearest `LocaleProvider`, then
 * `configureLocale()`, then the page's `<html lang>`, then `en-US`. Re-renders when the
 * configured locale or `<html lang>` changes. While hydrating, the server's answer
 * (`configureLocale()` or `en-US`) is used first so the markup matches, then the page's.
 */
export function useLocale(locale?: string): string {
  const provided = useContext(LocaleContext)
  const app = useSyncExternalStore(subscribeLocale, getLocale, serverLocale)
  return canonicalLocale(locale) ?? provided ?? app
}
