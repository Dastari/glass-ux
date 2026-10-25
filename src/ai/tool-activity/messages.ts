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
  detailsError: "The tool details could not be loaded. They stay on the server.",
  arguments: "Arguments",
  result: "Result",
  resultPending: "The result appears when the tool finishes.",
  resultUnavailable: "No result is available to this browser.",
  copy: (label: string) => `Copy ${label}`,
  truncatedNotice: "Truncated to 64 KB in this view.",
  toolRunning: "Tool running",
  runningOf: (running: number, total: string) => `Running ${running} of ${total}`,
  approvalSummary: (tools: string) => `${tools} · waiting for approval`,
  ran: (tools: string) => `Ran ${tools}`,
  failedSummary: (count: number) => `, ${count} failed`,
  failedStatus: "failed",
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
