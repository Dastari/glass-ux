import { numberRule } from "../form/rules.js"
import { DEFAULT_CURRENCY, formatMoney } from "./money.js"

/**
 * An amount in minor units (integer cents), or null when not required. Bounds in minor units:
 *
 *   moneySchema({ required: true, max: 1_000_000 })   → "Enter an amount up to $10,000.00"
 */
export function moneySchema(options: { required?: boolean; min?: number; max?: number; currency?: string; allowNegative?: boolean } = {}) {
  const currency = options.currency ?? DEFAULT_CURRENCY
  const min = options.min ?? (options.allowNegative ? undefined : 0)
  const show = (minor: number) => formatMoney(minor, { currency })
  const range =
    min !== undefined && options.max !== undefined
      ? `Enter an amount from ${show(min)} to ${show(options.max)}`
      : options.max !== undefined
        ? `Enter an amount up to ${show(options.max)}`
        : min !== undefined
          ? min === 0
            ? "Enter an amount of zero or more"
            : `Enter an amount of ${show(min)} or more`
          : "Enter an amount"
  return numberRule({ required: options.required, requiredMessage: "Enter an amount", rangeMessage: range, min, max: options.max, integer: true })
}
