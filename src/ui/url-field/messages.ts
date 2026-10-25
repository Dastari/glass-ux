import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for urlField. */
export const urlFieldMessages = defineMessages("urlField", {
  enterAWebAddress: "Enter a web address",
  northstarExample: (value0: unknown) => `${value0}://northstar.example`,
  openInANewTab: "Open in a new tab",
  notEncryptedHttpSendsEverythingInTheClear: "Not encrypted: http:// sends everything in the clear",
  suchAsNorthstarExample: (value0: unknown) => `such as ${value0}://northstar.example`,
  startTheAddressWith: (value0: unknown) => `Start the address with ${value0}://`,
  useAnAddressThatStartsWith: (value0: unknown) => `Use an address that starts with ${value0}`,
  enterAWebAddress2: (value0: unknown) => `Enter a web address ${value0}`,
  enterAFullAddress: (value0: unknown) => `Enter a full address ${value0}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    urlField: typeof urlFieldMessages.defaults
  }
}

/** Resolve urlField wording outside React; pass the component's locale. */
export function getUrlFieldMessages(locale = getLocale()): typeof urlFieldMessages.defaults {
  return resolveMessages(urlFieldMessages.namespace, urlFieldMessages.defaults, locale)
}
