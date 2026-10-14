import { textRule } from "../form/rules.js";

export interface RichTextSchemaOptions {
  /** Reject an empty or whitespace-only Markdown document. Default false. */
  required?: boolean;
  /** Maximum length of the Markdown source in UTF-16 code units. Default unrestricted. */
  maxLength?: number;
}

/** Validate the persisted Markdown string without parsing HTML or rewriting its content. */
export function richTextSchema({
  required,
  maxLength,
}: RichTextSchemaOptions = {}) {
  return textRule(
    (value) =>
      maxLength !== undefined && value.length > maxLength
        ? {
            ok: false,
            error: `Keep the document within ${maxLength.toLocaleString("en-AU")} characters`,
          }
        : { ok: true },
    { required, requiredMessage: "Write a document" },
  );
}
