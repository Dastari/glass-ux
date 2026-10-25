import { numberFormat } from "../../lib/locale/intl.js"
import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for results. */
export const resultsMessages = defineMessages("results", {
  series: "Series",
  added: "Added",
  removed: "Removed",
  of: (value0: unknown, value1: unknown) => `${value0} of ${value1}`,
  showAll: "Show all",
  inAWindow: "in a window",
  file: "File",
  download: (value0: unknown) => `Download ${value0}`,
  copy: "Copy",
  exportCsv: "Export CSV",
  openInAWindow: "Open in a window",
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  restricted: "Restricted",
  secret: "Secret",
  withheld: (value0: unknown) => `Withheld · ${value0}`,
  withheldFromTheBrowser: "Withheld from the browser",
  yes: "Yes",
  no: "No",
  fields: (value0: unknown) => `${value0} fields`,
  noBrowserSafePreviewTheResultIsAboveThis: "No browser-safe preview: the result is above this tool’s preview class",
  value: "Value",
  id: "Id",
  name: "Name",
  hidden: "Hidden.",
  reveal: "Reveal",
  truncatedByTheServer: "Truncated by the server.",
  open: (value0: unknown) => `Open ${value0}`,
  of2: (value0: unknown, value1: unknown) => `${value0} of ${value1} · `,
  previousImage: "Previous image",
  nextImage: "Next image",
  zoomOut: "Zoom out",
  alreadyFitted: "Already fitted",
  fit: "Fit",
  zoomIn: "Zoom in",
  largestZoom: "Largest zoom",
  fitToWindow: "Fit to window",
  images: (value0: unknown) => `${value0} images`,
  debug: "Debug",
  info: "Info",
  warning: "Warning",
  error: "Error",
  lines: (value0: unknown, value1: unknown) => `${value0} lines${value1}`,
  showTheLastLines: (value0: unknown) => `Show the last ${value0} lines`,
  showEarlierLines: (value0: unknown) => `Show ${value0} earlier lines`,
  loadingResult: "Loading result",
  hidden2: "Hidden",
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
