import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for signaturePad. */
export const signaturePadMessages = defineMessages("signaturePad", {
  padRole: "signature pad",
  signHere: "Sign here",
  signed: "Signed",
  notSigned: "Not signed",
  drawInstructions: "Draw with a mouse, pen or finger. Delete clears the signature, and Ctrl or Command with Z undoes the last stroke.",
  undo: "Undo",
  clear: "Clear",
  typeInstead: "Type instead",
  drawInstead: "Draw instead",
  typeYourName: "Type your full name",
  signatureRequired: "Add your signature",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    signaturePad: typeof signaturePadMessages.defaults
  }
}

/** Resolve signaturePad wording outside React; pass the component's locale. */
export function getSignaturePadMessages(locale = getLocale()): typeof signaturePadMessages.defaults {
  return resolveMessages(signaturePadMessages.namespace, signaturePadMessages.defaults, locale)
}
