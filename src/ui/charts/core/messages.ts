import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for chartCore. */
export const chartCoreMessages = defineMessages("chartCore", {
  name: "Name",
  size: "Size",
  share: "Share",
  items: "Items",
  drillPath: "Drill path",
  min: (value0: unknown) => `${value0} min`,
  in: (value0: unknown) => `in ${value0}`,
  ago: (value0: unknown) => `${value0} ago`,
  noData: "No data",
  couldnTLoadThisChart: "Couldn’t load this chart",
  retry: "Retry",
  viewAsChart: "View as chart",
  viewAsTable: "View as table",
  copyAsCsv: "Copy as CSV",
  theDataIsStillLoading: "The data is still loading",
  thereIsNoDataToCopy: "There is no data to copy",
  theDataDidnTLoad: "The data didn’t load",
  atLeastOneSeriesStaysVisible: "At least one series stays visible",
  legend: "Legend",
  series: "Series",
  table: (value0: unknown) => `${value0} · table`,
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    chartCore: typeof chartCoreMessages.defaults
  }
}

/** Resolve chartCore wording outside React; pass the component's locale. */
export function getChartCoreMessages(locale = getLocale()): typeof chartCoreMessages.defaults {
  return resolveMessages(chartCoreMessages.namespace, chartCoreMessages.defaults, locale)
}
