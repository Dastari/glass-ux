import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for hostnameField. */
export const hostnameFieldMessages = defineMessages("hostnameField", {
  copyHostName: "Copy host name",
  copyDomain: "Copy domain",
  longerThanCharactersOlderWindowsToolsSeeOnly: (value0: unknown, value1: unknown) => `Longer than ${value0} characters: older Windows tools see only the first ${value1}`,
  aDomain: "a domain",
  aHostName: "a host name",
  enter: (value0: unknown) => `Enter ${value0}`,
  enter2: (value0: unknown, value1: unknown) => `Enter ${value0} ${value1}`,
  enterWithoutAWildcard: (value0: unknown) => `Enter ${value0} without a wildcard`,
  useCharactersOrFewer: (value0: unknown) => `Use ${value0} characters or fewer`,
  keepEachPartBetweenDotsTo63Characters: "Keep each part between dots to 63 characters",
  useLettersDigitsAndHyphensOnly: (value0: unknown) => `Use letters, digits and hyphens only, ${value0}`,
  enterAFull: (value0: unknown, value1: unknown) => `Enter a full ${value0} ${value1}`,
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
