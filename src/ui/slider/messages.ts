import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for slider. */
export const sliderMessages = defineMessages("slider", {
  minimum: "Minimum",
  maximum: "Maximum",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    slider: typeof sliderMessages.defaults
  }
}

/** Resolve slider wording outside React; pass the component's locale. */
export function getSliderMessages(locale = getLocale()): typeof sliderMessages.defaults {
  return resolveMessages(sliderMessages.namespace, sliderMessages.defaults, locale)
}
