import { numberRule } from "../form/rules.js"
import { formatBytes, type ByteBase } from "./bytes.js"

/**
 * A size in bytes, or null when not required. Bounds in bytes:
 *
 *   byteSizeSchema({ required: true, max: 50e9 }) → "Enter a size up to 50 GB"
 */
export function byteSizeSchema(options: { required?: boolean; min?: number; max?: number; base?: ByteBase } = {}) {
  const show = (bytes: number) => formatBytes(bytes, { base: options.base })
  const range =
    options.min !== undefined && options.max !== undefined
      ? `Enter a size from ${show(options.min)} to ${show(options.max)}`
      : options.max !== undefined
        ? `Enter a size up to ${show(options.max)}`
        : options.min !== undefined
          ? `Enter a size of ${show(options.min)} or more`
          : "Enter a size"
  return numberRule({
    required: options.required,
    requiredMessage: "Enter a size, such as 500 MB",
    invalidMessage: "Enter a size such as 500 MB or 1.5 GB",
    rangeMessage: range,
    min: options.min ?? 0,
    max: options.max,
  })
}
