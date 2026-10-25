import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for urlField. */
export const urlFieldMessages = defineMessages("urlField", {
  enterAWebAddress: "Enter a web address",
  northstarExample: (scheme: string) => `${scheme}://northstar.example`,
  openInANewTab: "Open in a new tab",
  insecureUrl: "Not encrypted: http:// sends everything in the clear",
  suchAsNorthstarExample: (scheme: string) => `such as ${scheme}://northstar.example`,
  startTheAddressWith: (scheme: undefined | string) => `Start the address with ${scheme}://`,
  useAnAddressThatStartsWith: (schemes: string) => `Use an address that starts with ${schemes}`,
  invalidUrlExample: (example: string) => `Enter a web address ${example}`,
  enterAFullAddress: (example: string) => `Enter a full address ${example}`,
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
