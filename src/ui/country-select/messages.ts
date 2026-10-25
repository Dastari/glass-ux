import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for countrySelect. */
export const countrySelectMessages = defineMessages("countrySelect", {
  chooseACountry: "Choose a country",
  chooseACountryFromTheList: "Choose a country from the list",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    countrySelect: typeof countrySelectMessages.defaults
  }
}

/** Resolve countrySelect wording outside React; pass the component's locale. */
export function getCountrySelectMessages(locale = getLocale()): typeof countrySelectMessages.defaults {
  return resolveMessages(countrySelectMessages.namespace, countrySelectMessages.defaults, locale)
}
