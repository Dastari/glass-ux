import { getMacFieldMessages } from "./messages.js"
import { textRule } from "../form/rules.js"
import { macDigits } from "./mac.js"

/**
 * A string that is empty (unless required) or a MAC address in any notation:
 *
 *   macSchema({ required: true }) → "Enter a MAC address such as 00:15:65:AA:BB:CC"
 */
export function macSchema(options: { required?: boolean; /** Locale for validation wording. Defaults to getLocale(). */ locale?: string } = {}) {
  return textRule((value) => (macDigits(value) ? { ok: true } : { ok: false, error: getMacFieldMessages(options.locale).enterAMacAddressSuchAs001565AaBbCc }), {
    required: options.required,
    requiredMessage: () => getMacFieldMessages(options.locale).enterAMacAddress,
  })
}
