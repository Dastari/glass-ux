import { getMoneyFieldMessages } from "./messages.js"
import { numberRule } from "../form/rules.js"
import { DEFAULT_CURRENCY, formatMoney } from "./money.js"

/**
 * An amount in minor units (integer cents), or null when not required. Bounds in minor units:
 *
 *   moneySchema({ required: true, max: 1_000_000 })   → "Enter an amount up to $10,000.00"
 *
 * Amounts in messages use `locale`, or `getLocale()` when a value is checked. A
 * `LocaleProvider` cannot reach a schema: pass the field's locale explicitly.
 */
export function moneySchema(options: { required?: boolean; min?: number; max?: number; currency?: string; allowNegative?: boolean; locale?: string } = {}) {
  const currency = options.currency ?? DEFAULT_CURRENCY
  const min = options.min ?? (options.allowNegative ? undefined : 0)
  const show = (minor: number) => formatMoney(minor, { currency, locale: options.locale })
  const range = () =>
    min !== undefined && options.max !== undefined
      ? getMoneyFieldMessages(options.locale).enterAnAmountFromTo(show(min), show(options.max))
      : options.max !== undefined
        ? getMoneyFieldMessages(options.locale).enterAnAmountUpTo(show(options.max))
        : min !== undefined
          ? min === 0
            ? getMoneyFieldMessages(options.locale).enterAnAmountOfZeroOrMore
            : getMoneyFieldMessages(options.locale).enterAnAmountOfOrMore(show(min))
          : getMoneyFieldMessages(options.locale).enterAnAmount
  return numberRule({ required: options.required, requiredMessage: () => getMoneyFieldMessages(options.locale).enterAnAmount, rangeMessage: range, min, max: options.max, integer: true })
}
