import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for moneyField. */
export const moneyFieldMessages = defineMessages("moneyField", {
  enterAnAmountFromTo: (value0: unknown, value1: unknown) => `Enter an amount from ${value0} to ${value1}`,
  enterAnAmountUpTo: (value0: unknown) => `Enter an amount up to ${value0}`,
  enterAnAmountOfZeroOrMore: "Enter an amount of zero or more",
  enterAnAmountOfOrMore: (value0: unknown) => `Enter an amount of ${value0} or more`,
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
