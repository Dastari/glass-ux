import { textRule } from "../form/rules.js"
import { checkPhone, type PhoneKind } from "./phone.js"

export interface PhoneSchemaOptions {
  required?: boolean
  /** "mobile" refuses landlines. Default "any". */
  kind?: PhoneKind
}

/**
 * An E.164 phone number (with an optional ";ext=" extension), or "" when not required. The full
 * check (the number is valid for its country; a mobile for mobileSchema) runs once
 * libphonenumber-js has loaded — PhoneInput loads it on mount, so by the time someone leaves
 * the field it has. Before that, the E.164 shape is checked. Outside a form with a phone field
 * (an import), `await loadPhoneLibrary()` first.
 *
 *   phoneSchema({ required: true })   → "Enter a phone number", "Enter a full phone number, with the area code"
 *   mobileSchema()                    → "Enter a mobile number, not a landline"
 */
export function phoneSchema(options: PhoneSchemaOptions = {}) {
  const kind = options.kind ?? "any"
  return textRule((value) => checkPhone(value, kind), { required: options.required, requiredMessage: kind === "mobile" ? "Enter a mobile number" : "Enter a phone number" })
}

/** `phoneSchema` with `kind: "mobile"`: also refuses numbers that are not mobiles once the library has loaded. */
export function mobileSchema(options: Omit<PhoneSchemaOptions, "kind"> = {}) {
  return phoneSchema({ ...options, kind: "mobile" })
}
