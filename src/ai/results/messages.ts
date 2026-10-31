import { numberFormat } from "../../lib/locale/intl.js"
import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for results. */
export const resultsMessages = defineMessages("results", {
  series: "Series",
  added: "Added",
  removed: "Removed",
  diffSummary: ({ title, added, removed, locale = "en-US" }: { title: string; added: number; removed: number; locale?: string }) => `${title}: ${numberFormat(locale).format(added)} added, ${numberFormat(locale).format(removed)} removed`,
  resultPosition: (count: string, total: string) => `${count} of ${total}`,
  file: "File",
  download: (name: string) => `Download ${name}`,
  copy: "Copy",
  exportCsv: "Export CSV",
  openInAWindow: "Open in a window",
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  restricted: "Restricted",
  secret: "Secret",
  withheld: (classification: string) => `Withheld · ${classification}`,
  withheldFromTheBrowser: "Withheld from the browser",
  yes: "Yes",
  no: "No",
  previewUnavailable: "No browser-safe preview: the result is above this tool’s preview class",
  value: "Value",
  id: "Id",
  name: "Name",
  hidden: "Hidden.",
  reveal: "Reveal",
  truncatedByTheServer: "Truncated by the server.",
  open: (name: string) => `Open ${name}`,
  debug: "Debug",
  info: "Info",
  warning: "Warning",
  error: "Error",
  showTheLastLines: (count: number) => `Show the last ${count} lines`,
  showEarlierLines: (count: string) => `Show ${count} earlier lines`,
  loadingResult: "Loading result",
  hiddenStatus: "Hidden",
  itemCount: (count: number, locale = "en-US") => plural(locale, count, { one: `${numberFormat(locale).format(count)} item`, other: `${numberFormat(locale).format(count)} items` }),
  fileCount: (count: number, locale = "en-US") => plural(locale, count, { one: `${numberFormat(locale).format(count)} file`, other: `${numberFormat(locale).format(count)} files` }),
  imageCount: (count: number, locale = "en-US") => plural(locale, count, { one: `${numberFormat(locale).format(count)} image`, other: `${numberFormat(locale).format(count)} images` }),
  lineCount: (count: number, locale = "en-US") => plural(locale, count, { one: `${numberFormat(locale).format(count)} line`, other: `${numberFormat(locale).format(count)} lines` }),
  errorCount: (count: number, locale = "en-US") => plural(locale, count, { one: `${numberFormat(locale).format(count)} error`, other: `${numberFormat(locale).format(count)} errors` }),
  fieldCount: (count: number, locale = "en-US") => plural(locale, count, { one: `${numberFormat(locale).format(count)} field`, other: `${numberFormat(locale).format(count)} fields` }),
  sample: 'Sample',
  row: 'row',
  rows: 'rows',
  items: "items",
  showAllInWindow: (count: string, noun: string) => `Show all ${count} ${noun} in a window`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    results: typeof resultsMessages.defaults
  }
}

/** Resolve results wording outside React; pass the component's locale. */
export function getResultsMessages(locale = getLocale()): typeof resultsMessages.defaults {
  return resolveMessages(resultsMessages.namespace, resultsMessages.defaults, locale)
}
