import { defineMessages } from "../../lib/i18n/catalog.js"

/** CompareSlider's words. */
export const compareSliderMessages = defineMessages("compareSlider", {
  label: "Comparison position",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    compareSlider: typeof compareSliderMessages.defaults
  }
}
