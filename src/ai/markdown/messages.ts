import { defineMessages } from "../../lib/i18n/index.js"
/** English defaults for rendered Markdown chrome. */
export const markdownMessages = defineMessages("markdown", {
 table: "Table", done: "Done", notDone: "Not done", image: "Image", opensInNewTab: "(opens in a new tab)",
})
declare module "../../lib/i18n/catalog.js" { interface MessageCatalog { markdown: typeof markdownMessages.defaults } }
