import { getRichTextMessages } from "./messages.js"
import { numberFormat } from "../../lib/locale/intl.js";
import { getLocale } from "../../lib/locale/locale.js";
import { textRule } from "../form/rules.js";

export interface RichTextSchemaOptions {
  /** Reject an empty or whitespace-only Markdown document. Default false. */
  required?: boolean;
  /** Maximum length of the Markdown source in UTF-16 code units. Default unrestricted. */
  maxLength?: number;
  /** BCP 47 locale for the number in the length message. Default `getLocale()` when a value is checked. */
  locale?: string;
}

/** Validate the persisted Markdown string without parsing HTML or rewriting its content. */
export function richTextSchema({
  required,
  maxLength,
  locale,
}: RichTextSchemaOptions = {}) {
  return textRule(
    (value) =>
      maxLength !== undefined && value.length > maxLength
        ? {
            ok: false,
            error: getRichTextMessages(locale).keepTheDocumentWithinCharacters(numberFormat(locale ?? getLocale()).format(maxLength)),
          }
        : { ok: true },
    { required, requiredMessage: () => getRichTextMessages(locale).writeADocument2 },
  );
}
