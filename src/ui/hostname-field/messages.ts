import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for hostnameField. */
export const hostnameFieldMessages = defineMessages("hostnameField", {
  copyHostName: "Copy host name",
  copyDomain: "Copy domain",
  legacyNameWarning: (limit: number, visible: number) => `Longer than ${limit} characters: older Windows tools see only the first ${visible}`,
  aDomain: "a domain",
  aHostName: "a host name",
  enter: (kind: string) => `Enter ${kind}`,
  invalidNameExample: (kind: string, example: string) => `Enter ${kind} ${example}`,
  enterWithoutAWildcard: (kind: string) => `Enter ${kind} without a wildcard`,
  useCharactersOrFewer: (maximum: number) => `Use ${maximum} characters or fewer`,
  labelTooLong: "Keep each part between dots to 63 characters",
  useLettersDigitsAndHyphensOnly: (example: string) => `Use letters, digits and hyphens only, ${example}`,
  enterAFull: (kind: string, example: string) => `Enter a full ${kind} ${example}`,
  enterAHostName: "Enter a host name",
  enterADomain: "Enter a domain",
  domainName: 'domain',
  hostName: 'name',
  exampleDomain: "such as northstar.example",
  exampleFqdn: "such as printer.northstar.local",
  exampleHost: "such as NST-C106 or printer.northstar.local",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    hostnameField: typeof hostnameFieldMessages.defaults
  }
}

/** Resolve hostnameField wording outside React; pass the component's locale. */
export function getHostnameFieldMessages(locale = getLocale()): typeof hostnameFieldMessages.defaults {
  return resolveMessages(hostnameFieldMessages.namespace, hostnameFieldMessages.defaults, locale)
}
