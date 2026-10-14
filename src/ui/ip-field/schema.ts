import { asCheck, textRule } from "../form/rules.js"
import { parseIp, type CidrMode, type IpVersion } from "./ip.js"

export interface IpSchemaOptions {
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
  const what = options.cidr === "required" ? "a network" : options.version === 6 ? "an IPv6 address" : options.version === 4 ? "an IPv4 address" : "an IP address"
  return textRule((value) => asCheck(parseIp(value, options)), { required: options.required, requiredMessage: `Enter ${what}` })
}
