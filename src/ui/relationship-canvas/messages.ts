import { numberFormat } from "../../lib/locale/intl.js"
import { defineMessages, plural, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for relationshipCanvas. */
export const relationshipCanvasMessages = defineMessages("relationshipCanvas", {
  loading: "Loading the diagram",
  diagramLoading: "The diagram is loading",
  nothingToDraw: "Nothing to draw yet",
  controls: "Diagram controls",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  fitToView: "Fit to view",
  autoLayout: "Auto layout",
  instructions: "Arrow keys move between cards. Enter opens a card. Plus, minus and 0 zoom and fit.",
  instructionsMovable: "Arrow keys move between cards; with Shift they move the card. Drag a card by its header. Enter opens a card. Plus, minus and 0 zoom and fit.",
  rowList: ({ count, list, locale = "en-US" }: { count: number; list: string; locale?: string }) =>
    plural(locale, count, { one: `${numberFormat(locale).format(count)} row: ${list}.`, other: `${numberFormat(locale).format(count)} rows: ${list}.` }),
  noRows: "No rows.",
  linkTo: (label: string, card: string) => (label ? `${label} to ${card}` : `To ${card}`),
  linkFrom: (label: string, card: string) => (label ? `${label} from ${card}` : `From ${card}`),
  linkToItself: (label: string) => (label ? `${label} to itself` : "To itself"),
  links: (list: string) => `Links: ${list}.`,
  many: (label: string) => (label ? `${label} · many` : "many"),
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    relationshipCanvas: typeof relationshipCanvasMessages.defaults
  }
}

/** Resolve relationshipCanvas wording outside React; pass the component's locale. */
export function getRelationshipCanvasMessages(locale = getLocale()): typeof relationshipCanvasMessages.defaults {
  return resolveMessages(relationshipCanvasMessages.namespace, relationshipCanvasMessages.defaults, locale)
}
