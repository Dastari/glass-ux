import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for macField. */
export const macFieldMessages = defineMessages("macField", {
  copyMacAddress: "Copy MAC address",
  vendor: (value0: unknown) => `Vendor · ${value0}`,
  broadcastAddress: "Broadcast address",
  multicastAddress: "Multicast address",
  locallyAdministeredOftenARandomisedWiFiAddress: "Locally administered: often a randomised Wi-Fi address",
  enterAMacAddressSuchAs001565AaBbCc: "Enter a MAC address such as 00:15:65:AA:BB:CC",
  enterAMacAddress: "Enter a MAC address",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    macField: typeof macFieldMessages.defaults
  }
}

/** Resolve macField wording outside React; pass the component's locale. */
export function getMacFieldMessages(locale = getLocale()): typeof macFieldMessages.defaults {
  return resolveMessages(macFieldMessages.namespace, macFieldMessages.defaults, locale)
}
