import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for passwordField. */
export const passwordFieldMessages = defineMessages("passwordField", {
  capsLockIsOn: "Caps Lock is on",
  generateAPassword: "Generate a password",
  copyPassword: "Copy password",
  enterAPassword: "Enter a password",
  useCharactersOrMore: (value0: unknown) => `Use ${value0} characters or more`,
  chooseAStrongerPassword: "choose a stronger password",
  enterYourPassword: "Enter your password",
  tooWeak: 'Too weak',
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
  strengthFeedback5: 'Avoid common passwords and their variations',
  strengthFeedback6: 'Avoid your name, email or organisation',
  strengthFeedback7: 'Avoid years and dates',
  strengthFeedback8: 'Avoid repeated characters, sequences and keyboard runs',
  strengthFeedback9: 'Mix in letters, or use a longer passphrase',
  strengthFeedback10: 'Use 12 characters or more',
  strengthFeedback11: 'Add another word or a few more characters',
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
