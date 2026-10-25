import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for otpField. */
export const otpFieldMessages = defineMessages("otpField", {
  characterOf: (value0: unknown, value1: unknown) => `Character ${value0} of ${value1}`,
  enterTheCode: (value0: unknown, value1: unknown) => `Enter the ${value0}-${value1} code`,
  digit: "digit",
  character: "character",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    otpField: typeof otpFieldMessages.defaults
  }
}

/** Resolve otpField wording outside React; pass the component's locale. */
export function getOtpFieldMessages(locale = getLocale()): typeof otpFieldMessages.defaults {
  return resolveMessages(otpFieldMessages.namespace, otpFieldMessages.defaults, locale)
}
