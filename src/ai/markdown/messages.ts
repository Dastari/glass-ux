import { defineMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
/** English defaults for rendered Markdown chrome. */
export const markdownMessages = defineMessages("markdown", {
 table: "Table", done: "Done", notDone: "Not done", image: "Image", opensInNewTab: "(opens in a new tab)",
 regionNumber: (name: string, index: number, locale = "en-US") => `${name} ${numberFormat(locale).format(index)}`,
 footnotes: "Footnotes",
 backToReference: (index: number, locale = "en-US") => `Back to reference ${numberFormat(locale).format(index)}`,
})
declare module "../../lib/i18n/catalog.js" { interface MessageCatalog { markdown: typeof markdownMessages.defaults } }
