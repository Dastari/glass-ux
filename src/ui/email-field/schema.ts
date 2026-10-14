import { asCheck, textRule } from "../form/rules.js"
import { parseEmail } from "./email.js"

/**
 * A string that is empty (unless required) or an email address:
 *
 *   emailSchema({ required: true }) → "Enter an email address" / "Enter an email such as name@example.com.au"
 */
export function emailSchema(options: { required?: boolean } = {}) {
  return textRule((value) => asCheck(parseEmail(value)), { required: options.required, requiredMessage: "Enter an email address" })
}
