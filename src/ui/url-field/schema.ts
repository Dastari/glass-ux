import { getUrlFieldMessages } from "./messages.js"
import { textRule } from "../form/rules.js"
import { parseUrl, type UrlOptions } from "./url.js"

/**
 * A string that is empty (unless required) or a URL with an allowed scheme:
 *
 *   urlSchema({ required: true })                      → "Enter a web address"
 *   urlSchema({ schemes: ["https"] })                  → "Start the address with https://"
 */
export function urlSchema(options: UrlOptions & { required?: boolean; /** Locale for validation wording. Defaults to getLocale(). */ locale?: string } = {}) {
  return textRule(
    (value) => {
      const result = parseUrl(value, options)
      return result.ok ? { ok: true } : { ok: false, error: result.error }
    },
    { required: options.required, requiredMessage: () => getUrlFieldMessages(options.locale).enterAWebAddress }
  )
}
