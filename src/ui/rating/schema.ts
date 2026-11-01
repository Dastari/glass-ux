import { numberRule } from "../form/rules.js"
import { getRatingMessages } from "./messages.js"

/**
 * A rating from 0 to `max`, or null when not required:
 *
 *   ratingSchema({ required: true }) → "Choose a rating"
 */
export function ratingSchema(options: { required?: boolean; max?: number; /** Locale for validation wording. Defaults to getLocale(). */ locale?: string } = {}) {
  const message = () => getRatingMessages(options.locale).required
  return numberRule({ required: options.required, requiredMessage: message, rangeMessage: message, min: options.required ? 0.5 : 0, max: options.max ?? 5 })
}
