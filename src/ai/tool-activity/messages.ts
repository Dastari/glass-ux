import { numberFormat } from "../../lib/locale/intl.js"
import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for toolActivity. */
export const toolActivityMessages = defineMessages("toolActivity", {
  queued: "Queued",
  running: "Running",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
  waitingForApproval: "Waiting for approval",
  tool: "Tool",
  status: "Status",
  targets: "Targets",
  theToolDetailsCouldNotBeLoadedThey: "The tool details could not be loaded. They stay on the server.",
  arguments: "Arguments",
  result: "Result",
  theResultAppearsWhenTheToolFinishes: "The result appears when the tool finishes.",
  noResultIsAvailableToThisBrowser: "No result is available to this browser.",
  copy: (value0: unknown) => `Copy ${value0}`,
  truncatedTo64KbInThisView: "Truncated to 64 KB in this view.",
  toolRunning: "Tool running",
  runningOf: (value0: unknown, value1: unknown) => `Running ${value0} of ${value1}`,
  waitingForApproval2: (value0: unknown) => `${value0} · waiting for approval`,
  ran: (value0: unknown) => `Ran ${value0}`,
  failed2: (value0: unknown) => `, ${value0} failed`,
  failed3: "failed",
  working: "Working",
  waiting: "Waiting",
  retrying: "Retrying",
  searchingTheWeb: "Searching the web",
  withheldArguments: "The server withheld the arguments.",
  toolCount: (count: number, locale = "en-US") => plural(locale, count, { one: `${numberFormat(locale).format(count)} tool`, other: `${numberFormat(locale).format(count)} tools` }),
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    toolActivity: typeof toolActivityMessages.defaults
  }
}

/** Resolve toolActivity wording outside React; pass the component's locale. */
export function getToolActivityMessages(locale = getLocale()): typeof toolActivityMessages.defaults {
  return resolveMessages(toolActivityMessages.namespace, toolActivityMessages.defaults, locale)
}
