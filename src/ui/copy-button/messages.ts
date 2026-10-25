import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for copyButton. */
export const copyButtonMessages = defineMessages("copyButton", {
  copyIsNotAvailableInThisBrowser: "Copy is not available in this browser",
  copied: "Copied",
  copyFailed: "Copy failed",
  copy: "Copy",
  notCopied: "Not copied",
  theBrowserBlockedTheClipboardSelectTheText: "The browser blocked the clipboard. Select the text and copy it instead.",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    copyButton: typeof copyButtonMessages.defaults
  }
}

/** Resolve copyButton wording outside React; pass the component's locale. */
export function getCopyButtonMessages(locale = getLocale()): typeof copyButtonMessages.defaults {
  return resolveMessages(copyButtonMessages.namespace, copyButtonMessages.defaults, locale)
}
