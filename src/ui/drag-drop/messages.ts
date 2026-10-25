import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for dragDrop. */
export const dragDropMessages = defineMessages("dragDrop", {
  draggable: "draggable",
  move: (label: string) => `Move ${label}`,
  positionOf: (position: number, count: number) => `, position ${position} of ${count}`,
  in: (zone: string, position: string) => ` in ${zone}${position}`,
  arrowKeysMoveItSpaceOrEnter: " Arrow keys move it, Space or Enter drops it, Escape cancels.",
  lifted: (label: string, place: string, instructions: string) => `Lifted ${label}${place}.${instructions}`,
  here: "Here",
  cannotBeDroppedHere: (label: string) => `${label} cannot be dropped here`,
  notOverADropArea: "Not over a drop area.",
  dropped: (label: string, place: string) => `Dropped ${label}${place}.`,
  to: (zone: string, position: string) => ` to ${zone}${position}`,
  moveCancelledReturned: (label: string, place: string) => `Move cancelled. ${label} returned${place}.`,
  cannotBeDroppedIn: (label: string, zone: string, reason: string) => `${label} cannot be dropped in ${zone}${reason}.`,
  couldNotBeDroppedIn: (label: string, zone: string, reason: string) => `${label} could not be dropped in ${zone}${reason}.`,
  dragInstructions: "Press Space or Enter to lift. Arrow keys move, Space or Enter drops, Escape cancels.",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    dragDrop: typeof dragDropMessages.defaults
  }
}

/** Resolve dragDrop wording outside React; pass the component's locale. */
export function getDragDropMessages(locale = getLocale()): typeof dragDropMessages.defaults {
  return resolveMessages(dragDropMessages.namespace, dragDropMessages.defaults, locale)
}
