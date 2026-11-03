import { defineMessages } from "../../lib/i18n/catalog.js"

/** ColorWheel's words. */
export const colorWheelMessages = defineMessages("colorWheel", {
  /** The group's name when no label names it. */
  wheel: "Colour wheel",
  hue: "Hue",
  amount: "Amount",
  /** The hue slider's spoken value: the hue family, then the formatted angle ("Green, 142°"). */
  hueValue: ({ name, angle }: { name: string; angle: string }) => `${name}, ${angle}`,
  /** The amount at the centre, where there is no tint. */
  neutral: "Neutral",
  /** The visible readout: the formatted angle, then the formatted amount ("142° · 35%"). */
  readout: ({ angle, amount }: { angle: string; amount: string }) => `${angle} · ${amount}`,
  hueRed: "Red",
  hueOrange: "Orange",
  hueYellow: "Yellow",
  hueGreen: "Green",
  hueCyan: "Cyan",
  hueBlue: "Blue",
  huePurple: "Purple",
  hueMagenta: "Magenta",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    colorWheel: typeof colorWheelMessages.defaults
  }
}
