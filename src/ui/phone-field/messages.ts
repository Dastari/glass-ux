import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for phoneField. */
export const phoneFieldMessages = defineMessages("phoneField", {
  ext: "ext.",
  extension: "Extension",
  copyNumber: "Copy number",
  country: (value0: unknown, value1: unknown) => `Country: ${value0}${value1}`,
  chooseACountry: "Choose a country",
  countryOrCode: "Country or code",
  searchCountries: "Search countries",
  noCountryMatches: (query: string) => `No country matches “${query}”`,
  mobileNumber: "mobile number",
  phoneNumber: "phone number",
  enterA: (value0: unknown) => `Enter a ${value0}`,
  enterAFullWithTheAreaCode: (value0: unknown) => `Enter a full ${value0}, with the area code`,
  itsCountry: "its country",
  checkTheItIsnTAValidNumber: (value0: unknown, value1: unknown) => `Check the ${value0}: it isn't a valid number for ${value1}`,
  enterAMobileNumberNotALandline: "Enter a mobile number, not a landline",
  enterAMobileNumber: "Enter a mobile number",
  enterAPhoneNumber: "Enter a phone number",
  countryCount: (count: number, locale = "en-US") => plural(locale, count, { one: `${count} country`, other: `${count} countries` }),
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    phoneField: typeof phoneFieldMessages.defaults
  }
}

/** Resolve phoneField wording outside React; pass the component's locale. */
export function getPhoneFieldMessages(locale = getLocale()): typeof phoneFieldMessages.defaults {
  return resolveMessages(phoneFieldMessages.namespace, phoneFieldMessages.defaults, locale)
}
