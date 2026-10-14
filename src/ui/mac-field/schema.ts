import { textRule } from "../form/rules.js"
import { macDigits } from "./mac.js"

/**
 * A string that is empty (unless required) or a MAC address in any notation:
 *
 *   macSchema({ required: true }) → "Enter a MAC address such as 00:15:65:AA:BB:CC"
 */
export function macSchema(options: { required?: boolean } = {}) {
  return textRule((value) => (macDigits(value) ? { ok: true } : { ok: false, error: "Enter a MAC address such as 00:15:65:AA:BB:CC" }), {
    required: options.required,
    requiredMessage: "Enter a MAC address",
  })
}
