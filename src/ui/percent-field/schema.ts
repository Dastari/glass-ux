import { numberRule } from "../form/rules.js"

/**
 * A percentage, or null when not required. Bounds are in the value's scale:
 *
 *   percentSchema({ required: true, min: 50, max: 99 })  → "Enter a percentage from 50 to 99"
 *   percentSchema({ scale: "fraction" })                 → 0 to 1
 */
export function percentSchema(options: { required?: boolean; min?: number; max?: number; scale?: "whole" | "fraction" } = {}) {
  const fraction = options.scale === "fraction"
  const min = options.min ?? 0
  const max = options.max ?? (fraction ? 1 : 100)
  const shown = (value: number) => (fraction ? Math.round(value * 1e4) / 100 : value)
  return numberRule({
    required: options.required,
    requiredMessage: "Enter a percentage",
    rangeMessage: `Enter a percentage from ${shown(min)} to ${shown(max)}`,
    min,
    max,
  })
}
