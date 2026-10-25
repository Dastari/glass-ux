import { DirectionProvider as BaseDirectionProvider, useDirection as useBaseDirection } from "@base-ui/react/direction-provider"
import type { ReactNode } from "react"

/** The inline reading direction shared by Glass UX and Base UI. */
export type TextDirection = "ltr" | "rtl"

/** Props for the direction context. Set the matching `dir` attribute on the document or region. */
export interface DirectionProviderProps {
  /** Reading direction. Defaults to left-to-right. */
  direction?: TextDirection
  /** Components using this direction, including portalled overlays. */
  children?: ReactNode
}

/** Shares reading direction with Base UI keyboard and pointer behaviour. Does not create a DOM wrapper. */
export function DirectionProvider(props: DirectionProviderProps) {
  return <BaseDirectionProvider {...props} />
}

/** Reads the nearest DirectionProvider, defaulting to left-to-right. */
export function useDirection(): TextDirection {
  return useBaseDirection()
}

const RTL_LANGUAGES = new Set(["ar", "arc", "bgn", "ckb", "dv", "fa", "he", "khw", "ks", "lrc", "mzn", "nqo", "ps", "sd", "syr", "ug", "ur", "yi"])
const RTL_SCRIPTS = new Set(["Adlm", "Arab", "Armi", "Avst", "Chrs", "Elym", "Hatr", "Hebr", "Hung", "Khar", "Lydi", "Mand", "Mani", "Mend", "Merc", "Mero", "Narb", "Nbat", "Nkoo", "Orkh", "Palm", "Phli", "Phlp", "Phnx", "Prti", "Rohg", "Samr", "Sarb", "Sogd", "Sogo", "Syrc", "Thaa", "Yezi"])

/** Returns the locale's writing direction, using Intl text info where available. Invalid tags return `ltr`. */
export function localeDirection(tag: string): TextDirection {
  try {
    const locale = new Intl.Locale(tag) as Intl.Locale & {
      getTextInfo?: () => { direction: TextDirection }
      textInfo?: { direction: TextDirection }
    }
    const info = locale.getTextInfo?.() ?? locale.textInfo
    if (info) return info.direction
    // Explicit scripts take precedence: az-Arab is RTL, ar-Latn is LTR.
    const script = locale.script ?? locale.maximize().script
    return script ? (RTL_SCRIPTS.has(script) ? "rtl" : "ltr") : RTL_LANGUAGES.has(locale.language) ? "rtl" : "ltr"
  } catch {
    return "ltr"
  }
}
