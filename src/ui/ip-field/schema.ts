import { getIpFieldMessages } from "./messages.js"
import { asCheck, textRule } from "../form/rules.js"
import { parseIp, type CidrMode, type IpVersion } from "./ip.js"

export interface IpSchemaOptions {
  /** Locale for validation wording. Defaults to getLocale(). */
  locale?: string
  version?: IpVersion | "any"
  cidr?: CidrMode
  required?: boolean
}

/**
 * A string that is empty (unless required) or an address the options allow. Messages come
 * from the same parser IpInput normalises with:
 *
 *   ipSchema({ required: true })                     → "Enter an IP address such as …"
 *   ipSchema({ version: 4, cidr: "required" })       → "Add a prefix length, such as /24"
 */
export function ipSchema(options: IpSchemaOptions = {}) {
  const what = options.cidr === "required" ? "network" : options.version ?? "any"
  return textRule((value) => asCheck(parseIp(value, options)), { required: options.required, requiredMessage: () => getIpFieldMessages(options.locale).enter(what) })
}
