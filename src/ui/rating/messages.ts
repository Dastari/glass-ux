import { defineMessages, plural, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"
import { numberFormat } from "../../lib/locale/intl.js"

/** Rating's words. */
export const ratingMessages = defineMessages("rating", {
  /** The group's name when a Field, `aria-label` or `aria-labelledby` does not name it. */
  label: "Rating",
  /** A value out of the total, the unit agreeing with the total: "3.5 of 5 stars". The value arrives formatted. */
  valueText: ({ value, total, locale = "en-US" }: { value: string; total: number; locale?: string }) =>
    plural(locale, total, {
      one: `${value} of ${numberFormat(locale).format(total)} star`,
      other: `${value} of ${numberFormat(locale).format(total)} stars`,
    }),
  /** A display that has no rating yet. */
  unrated: "Not rated",
  /** A read-only display's name with its value: "Rating: 3.5 of 5 stars". */
  display: ({ label, value }: { label: string; value: string }) => `${label}: ${value}`,
  /** What a required field says when nothing is chosen. */
  required: "Choose a rating",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    rating: typeof ratingMessages.defaults
  }
}

/** Resolve rating wording outside React; pass the component's locale. */
export function getRatingMessages(locale = getLocale()): typeof ratingMessages.defaults {
  return resolveMessages(ratingMessages.namespace, ratingMessages.defaults, locale)
}
