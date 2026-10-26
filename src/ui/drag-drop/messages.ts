import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for dragDrop. */
export const dragDropMessages = defineMessages("dragDrop", {
  draggable: "draggable",
  move: (label: string) => `Move ${label}`,
  lifted: ({ label, zone, position, count, keyboard }: { label: string; zone: string | null; position: number | null; count: number | null; keyboard: boolean }) => `Lifted ${label}${zone ? ` in ${zone}${position !== null && count !== null ? `, position ${position} of ${count}` : ""}` : ""}.${keyboard ? " Arrow keys move it, Space or Enter drops it, Escape cancels." : ""}`,
  notOverADropArea: "Not over a drop area.",
  dropped: ({ label, zone, position, count }: { label: string; zone: string | null; position: number | null; count: number | null }) => `Dropped ${label}${zone ? ` in ${zone}${position !== null && count !== null ? `, position ${position} of ${count}` : ""}` : ""}.`,
  moveCancelledReturned: ({ label, zone, position, count }: { label: string; zone: string | null; position: number | null; count: number | null }) => `Move cancelled. ${label} returned${zone ? ` to ${zone}${position !== null && count !== null ? `, position ${position} of ${count}` : ""}` : ""}.`,
  cannotBeDroppedIn: ({ label, zone, reason }: { label: string; zone: string; reason?: string }) => `${label} cannot be dropped in ${zone}${reason ? `: ${reason}` : ""}.`,
  couldNotBeDroppedIn: ({ label, zone, reason }: { label: string; zone: string; reason?: string }) => `${label} could not be dropped in ${zone}${reason ? `: ${reason}` : ""}.`,
  dragInstructions: "Press Space or Enter to lift. Arrow keys move, Space or Enter drops, Escape cancels.",
  moved: ({ zone, position, count }: { zone: string; position: number | null; count: number | null }) => `${zone}${position !== null && count !== null ? `, position ${position} of ${count}` : ""}.`,
  moveBlocked: ({ zone, label, reason }: { zone: string | null; label: string; reason: string }) => `${zone ?? "Here"}: ${reason || `${label} cannot be dropped here`}.`,
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
