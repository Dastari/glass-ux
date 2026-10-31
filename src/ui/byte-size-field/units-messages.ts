import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/**
 * English defaults for byteUnits: the symbols that follow a size ("12 MB"). A prefixed symbol
 * is built from the prefix letter the caller chooses, so one message covers kB and KB (decimal
 * and Windows style) and KiB (binary).
 */
export const byteUnitsMessages = defineMessages("byteUnits", {
  byte: "B",
  prefixedUnit: ({ prefix, binary }: { prefix: string; binary: boolean }) => `${prefix}${binary ? "iB" : "B"}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    byteUnits: typeof byteUnitsMessages.defaults
  }
}

/** Resolve byteUnits wording outside React; pass the component's locale. */
export function getByteUnitsMessages(locale = getLocale()): typeof byteUnitsMessages.defaults {
  return resolveMessages(byteUnitsMessages.namespace, byteUnitsMessages.defaults, locale)
}
