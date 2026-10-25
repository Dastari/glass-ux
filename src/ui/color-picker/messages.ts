import { defineMessages } from "../../lib/i18n/catalog.js"

/** ColorPicker and ColorField's words. */
export const colorPickerMessages = defineMessages("colorPicker", {
  picker: "Colour picker",
  area: "Lightness and chroma",
  areaValue: (lightness: number, chroma: number) => `Lightness ${lightness}%, chroma ${chroma}`,
  hue: "Hue",
  alpha: "Opacity",
  hex: "Hex colour",
  eyeDropper: "Pick a colour from the screen",
  swatches: "Preset colours",
  open: "Choose a colour",
  none: "No colour",
  clear: "Clear colour",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    colorPicker: typeof colorPickerMessages.defaults
  }
}
