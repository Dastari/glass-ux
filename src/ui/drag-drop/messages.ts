import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for dragDrop. */
export const dragDropMessages = defineMessages("dragDrop", {
  draggable: "draggable",
  move: (value0: unknown) => `Move ${value0}`,
  positionOf: (value0: unknown, value1: unknown) => `, position ${value0} of ${value1}`,
  in: (value0: unknown, value1: unknown) => ` in ${value0}${value1}`,
  arrowKeysMoveItSpaceOrEnter: " Arrow keys move it, Space or Enter drops it, Escape cancels.",
  lifted: (value0: unknown, value1: unknown, value2: unknown) => `Lifted ${value0}${value1}.${value2}`,
  here: "Here",
  cannotBeDroppedHere: (value0: unknown) => `${value0} cannot be dropped here`,
  notOverADropArea: "Not over a drop area.",
  dropped: (value0: unknown, value1: unknown) => `Dropped ${value0}${value1}.`,
  to: (value0: unknown, value1: unknown) => ` to ${value0}${value1}`,
  moveCancelledReturned: (value0: unknown, value1: unknown) => `Move cancelled. ${value0} returned${value1}.`,
  cannotBeDroppedIn: (value0: unknown, value1: unknown, value2: unknown) => `${value0} cannot be dropped in ${value1}${value2}.`,
  couldNotBeDroppedIn: (value0: unknown, value1: unknown, value2: unknown) => `${value0} could not be dropped in ${value1}${value2}.`,
  pressSpaceOrEnterToLiftArrowKeys: "Press Space or Enter to lift. Arrow keys move, Space or Enter drops, Escape cancels.",
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
