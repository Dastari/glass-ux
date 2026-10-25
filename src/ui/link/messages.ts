import { defineMessages } from "../../lib/i18n/catalog.js"

/** Link's words. */
export const linkMessages = defineMessages("link", {
  newTab: "(opens in a new tab)",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    link: typeof linkMessages.defaults
  }
}
