import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for passwordField. */
export const passwordFieldMessages = defineMessages("passwordField", {
  capsLockIsOn: "Caps Lock is on",
  generateAPassword: "Generate a password",
  copyPassword: "Copy password",
  enterAPassword: "Enter a password",
  useCharactersOrMore: (minimum: number) => `Use ${minimum} characters or more`,
  chooseAStrongerPassword: "choose a stronger password",
  enterYourPassword: "Enter your password",
  tooWeak: 'Too weak',
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
  commonPassword: 'Avoid common passwords and their variations',
  personalPassword: 'Avoid your name, email or organisation',
  datePassword: 'Avoid years and dates',
  predictablePassword: 'Avoid repeated characters, sequences and keyboard runs',
  numericPassword: 'Mix in letters, or use a longer passphrase',
  shortPassword: 'Use 12 characters or more',
  longerPassword: 'Add another word or a few more characters',
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    passwordField: typeof passwordFieldMessages.defaults
  }
}

/** Resolve passwordField wording outside React; pass the component's locale. */
export function getPasswordFieldMessages(locale = getLocale()): typeof passwordFieldMessages.defaults {
  return resolveMessages(passwordFieldMessages.namespace, passwordFieldMessages.defaults, locale)
}
