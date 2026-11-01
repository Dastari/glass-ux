import { defineMessages } from "../../lib/i18n/catalog.js"

/** GradientPicker's words. */
export const gradientPickerMessages = defineMessages("gradientPicker", {
  picker: "Gradient picker",
  preview: "Gradient preview",
  kind: "Gradient type",
  linear: "Linear",
  radial: "Radial",
  angular: "Angular",
  angle: "Angle",
  stops: "Colour stops",
  stop: (number: string) => `Stop ${number}`,
  stopValue: (position: string, color: string) => `${position}, ${color}`,
  position: "Position",
  addStop: "Add stop",
  removeStop: "Remove stop",
  mostStops: (count: string) => `A gradient holds up to ${count} stops`,
  fewestStops: "A gradient needs two stops",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    gradientPicker: typeof gradientPickerMessages.defaults
  }
}
