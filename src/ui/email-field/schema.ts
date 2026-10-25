import { getEmailFieldMessages } from "./messages.js"
import { asCheck, textRule } from "../form/rules.js"
import { parseEmail } from "./email.js"

/**
 * A string that is empty (unless required) or an email address:
 *
 *   emailSchema({ required: true }) → "Enter an email address" / "Enter an email such as name@example.com.au"
 */
export function emailSchema(options: { required?: boolean; /** Locale for validation wording. Defaults to getLocale(). */ locale?: string } = {}) {
  return textRule((value) => asCheck(parseEmail(value, options.locale)), { required: options.required, requiredMessage: () => getEmailFieldMessages(options.locale).enterAnEmailAddress })
}
