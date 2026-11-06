import { defineMessages } from "../../lib/i18n/index.js"

/** English defaults for richTextReader. */
export const richTextReaderMessages = defineMessages("richTextReader", {
  document: "Document",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    richTextReader: typeof richTextReaderMessages.defaults
  }
}
