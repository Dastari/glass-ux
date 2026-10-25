import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for emailField. */
export const emailFieldMessages = defineMessages("emailField", {
  didYouMean: (address: string) => `Did you mean ${address}?`,
  enterAnEmailAddress: "Enter an email address",
  enterAnEmailSuchAs: (example: string) => `Enter an email such as ${example}`,
  emailTooLong: "Use 254 characters or fewer",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    emailField: typeof emailFieldMessages.defaults
  }
}

/** Resolve emailField wording outside React; pass the component's locale. */
export function getEmailFieldMessages(locale = getLocale()): typeof emailFieldMessages.defaults {
  return resolveMessages(emailFieldMessages.namespace, emailFieldMessages.defaults, locale)
}
