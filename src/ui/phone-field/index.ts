import type {} from "./messages.js"
export { MobileField, PhoneField, PhoneInput, type MobileFieldProps, type PhoneFieldProps, type PhoneInputProps } from "./phone-field.js"
export {
  checkPhone,
  countryOfValue,
  E164_SHAPE,
  examplePhone,
  formatPhone,
  isInternationalText,
  joinPhoneValue,
  loadPhoneLibrary,
  parsePhone,
  phoneLibrary,
  splitPhoneValue,
  usePhoneLibrary,
  type ParsedPhone,
  type PhoneCheck,
  type PhoneDisplay,
  type PhoneKind,
  type PhoneLib,
  type PhoneValueParts,
} from "./phone.js"
export { mobileSchema, phoneSchema, type PhoneSchemaOptions } from "./schema.js"
