import { numberRule } from "../form/rules.js"
import { formatDuration } from "./duration.js"

/**
 * A duration in seconds, or null when not required. Bounds in seconds:
 *
 *   durationSchema({ required: true, min: 60, max: 86400 }) → "Enter a duration from 1 minute to 1 day"
 */
export function durationSchema(options: { required?: boolean; min?: number; max?: number } = {}) {
  const long = (seconds: number) => formatDuration(seconds, { style: "long" })
  const range =
    options.min !== undefined && options.max !== undefined
      ? `Enter a duration from ${long(options.min)} to ${long(options.max)}`
      : options.max !== undefined
        ? `Enter a duration up to ${long(options.max)}`
        : options.min !== undefined
          ? `Enter a duration of ${long(options.min)} or more`
          : "Enter a duration"
  return numberRule({
    required: options.required,
    requiredMessage: "Enter a duration, such as 1h 30m",
    invalidMessage: "Enter a duration such as 1h 30m, 90m or 1:30",
    rangeMessage: range,
    min: options.min ?? 0,
    max: options.max,
  })
}
