import { getPortFieldMessages } from "./messages.js"
import { numberRule } from "../form/rules.js"
import { PORT_MAX, PORT_MIN } from "./ports.js"

/**
 * A port number, or null when not required:
 *
 *   portSchema({ required: true }) → "Enter a port from 1 to 65535"
 */
export function portSchema(options: { required?: boolean; /** Locale for validation wording. Defaults to getLocale(). */ locale?: string } = {}) {
  const message = () => getPortFieldMessages(options.locale).enterAPortFromTo(PORT_MIN, PORT_MAX)
  return numberRule({ required: options.required, requiredMessage: message, rangeMessage: message, min: PORT_MIN, max: PORT_MAX, integer: true })
}
