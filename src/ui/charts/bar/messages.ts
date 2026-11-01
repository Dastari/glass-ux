import { defineMessages, resolveMessages } from "../../../lib/i18n/index.js"
import { getLocale } from "../../../lib/locale/locale.js"

/** English defaults for bar. */
export const barMessages = defineMessages("bar", {
  category: "Category",
  total: "Total",
  more: (count: number) => `+${count} more`,
  inspectValues: (label: string) => `${label} — inspect values`,
  totalValue: (value: string) => `Total ${value}`,
  inspectValuesEnterSelects: (label: string) => `${label} — inspect values, Enter selects`,
  leftAxis: "left axis",
  rightAxis: "right axis",
  leftAxisNote: ({ axis, series }: { axis: string; series: string }) => `Left axis: ${axis}, for ${series}.`,
  rightAxisNote: ({ axis, series }: { axis: string; series: string }) => `Right axis: ${axis}, for ${series}.`,
  seriesWithAxis: (series: string, axis: string) => `${series} (${axis})`,
  seriesWithAxisAndUnit: ({ series, axis, unit }: { series: string; axis: string; unit: string }) => `${series} (${axis}, ${unit})`,
})

declare module "../../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    bar: typeof barMessages.defaults
  }
}

/** Resolve bar wording outside React; pass the component's locale. */
export function getBarMessages(locale = getLocale()): typeof barMessages.defaults {
  return resolveMessages(barMessages.namespace, barMessages.defaults, locale)
}
