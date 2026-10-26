import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for moneyField. */
export const moneyFieldMessages = defineMessages("moneyField", {
  enterAnAmountFromTo: (minimum: string, maximum: string) => `Enter an amount from ${minimum} to ${maximum}`,
  enterAnAmountUpTo: (maximum: string) => `Enter an amount up to ${maximum}`,
  enterAnAmountOfZeroOrMore: "Enter an amount of zero or more",
  enterAnAmountOfOrMore: (minimum: string) => `Enter an amount of ${minimum} or more`,
  enterAnAmount: "Enter an amount",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    moneyField: typeof moneyFieldMessages.defaults
  }
}

/** Resolve moneyField wording outside React; pass the component's locale. */
export function getMoneyFieldMessages(locale = getLocale()): typeof moneyFieldMessages.defaults {
  return resolveMessages(moneyFieldMessages.namespace, moneyFieldMessages.defaults, locale)
}
