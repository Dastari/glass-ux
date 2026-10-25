import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for hostnameField. */
export const hostnameFieldMessages = defineMessages("hostnameField", {
  copyHostName: "Copy host name",
  copyDomain: "Copy domain",
  legacyNameWarning: (limit: number, visible: number) => `Longer than ${limit} characters: older Windows tools see only the first ${visible}`,
  enter: (kind: "host" | "domain"): string => kind === "domain" ? "Enter a domain" : "Enter a host name",
  invalidNameExample: (kind: "host" | "domain", example: string) => `Enter ${kind === "domain" ? "a domain" : "a host name"} such as ${example}`,
  enterWithoutAWildcard: (kind: "host" | "domain") => `Enter ${kind === "domain" ? "a domain" : "a host name"} without a wildcard`,
  useCharactersOrFewer: (maximum: number) => `Use ${maximum} characters or fewer`,
  labelTooLong: "Keep each part between dots to 63 characters",
  useLettersDigitsAndHyphensOnly: (example: string) => `Use letters, digits and hyphens only, such as ${example}`,
  enterAFull: (kind: "host" | "domain", example: string) => `Enter a full ${kind === "domain" ? "domain" : "name"} such as ${example}`,
  enterAHostName: "Enter a host name",
  enterADomain: "Enter a domain",
  edgeHyphen: "A part can't start or end with a hyphen",
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
