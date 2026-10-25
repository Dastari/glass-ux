import { getDurationFieldMessages } from "./messages.js"
import { numberRule } from "../form/rules.js"
import { formatDuration } from "./duration.js"

/**
 * A duration in seconds, or null when not required. Bounds in seconds:
 *
 *   durationSchema({ required: true, min: 60, max: 86400 }) → "Enter a duration from 1 minute to 1 day"
 */
export function durationSchema(options: { /** Locale for validation wording. Defaults to getLocale(). */ locale?: string; required?: boolean; min?: number; max?: number } = {}) {
  const long = (seconds: number) => formatDuration(seconds, { style: "long", locale: options.locale })
  const range = () =>
    options.min !== undefined && options.max !== undefined
      ? getDurationFieldMessages(options.locale).enterADurationFromTo(long(options.min), long(options.max))
      : options.max !== undefined
        ? getDurationFieldMessages(options.locale).enterADurationUpTo(long(options.max))
        : options.min !== undefined
          ? getDurationFieldMessages(options.locale).enterADurationOfOrMore(long(options.min))
          : getDurationFieldMessages(options.locale).enterADuration
  return numberRule({
    required: options.required,
    requiredMessage: () => getDurationFieldMessages(options.locale).enterADurationSuchAs1h30m,
    invalidMessage: () => getDurationFieldMessages(options.locale).enterADurationSuchAs1h30m90m,
    rangeMessage: range,
    min: options.min ?? 0,
    max: options.max,
  })
}
