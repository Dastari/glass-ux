import { defineMessages } from "../../lib/i18n/catalog.js"

/** Toolbar's words. */
export const toolbarMessages = defineMessages("toolbar", {
  more: "More",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    toolbar: typeof toolbarMessages.defaults
  }
}
