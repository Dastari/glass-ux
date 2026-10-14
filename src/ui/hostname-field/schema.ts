import { asCheck, textRule } from "../form/rules.js"
import { parseDomain, parseHostname, type HostnameOptions } from "./hostname.js"

/**
 * A string that is empty (unless required) or a host name:
 *
 *   hostnameSchema({ required: true })              → "Enter a host name"
 *   hostnameSchema({ fqdn: true })                  → "Enter a full name such as printer.northstar.local"
 */
export function hostnameSchema(options: HostnameOptions & { required?: boolean } = {}) {
  return textRule((value) => asCheck(parseHostname(value, options)), { required: options.required, requiredMessage: "Enter a host name" })
}

/** A string that is empty (unless required) or a domain: domainSchema({ required: true, wildcard: true }). */
export function domainSchema(options: Omit<HostnameOptions, "fqdn"> & { required?: boolean } = {}) {
  return textRule((value) => asCheck(parseDomain(value, options)), { required: options.required, requiredMessage: "Enter a domain" })
}
