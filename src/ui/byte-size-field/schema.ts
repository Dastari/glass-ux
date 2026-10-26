import { getByteSizeFieldMessages } from "./messages.js"
import { numberRule } from "../form/rules.js"
import { formatBytes, type ByteBase } from "./bytes.js"

/**
 * A size in bytes, or null when not required. Bounds in bytes:
 *
 *   byteSizeSchema({ required: true, max: 50e9 }) → "Enter a size up to 50 GB"
 *
 * Sizes in messages use `locale`, or `getLocale()` when a value is checked.
 */
export function byteSizeSchema(options: { required?: boolean; min?: number; max?: number; base?: ByteBase; locale?: string } = {}) {
  const show = (bytes: number) => formatBytes(bytes, { base: options.base, locale: options.locale })
  const range = () =>
    options.min !== undefined && options.max !== undefined
      ? getByteSizeFieldMessages(options.locale).enterASizeFromTo(show(options.min), show(options.max))
      : options.max !== undefined
        ? getByteSizeFieldMessages(options.locale).enterASizeUpTo(show(options.max))
        : options.min !== undefined
          ? getByteSizeFieldMessages(options.locale).enterASizeOfOrMore(show(options.min))
          : getByteSizeFieldMessages(options.locale).enterASize
  return numberRule({
    required: options.required,
    requiredMessage: () => getByteSizeFieldMessages(options.locale).invalidSize,
    invalidMessage: () => getByteSizeFieldMessages(options.locale).sizeExamples,
    rangeMessage: range,
    min: options.min ?? 0,
    max: options.max,
  })
}
