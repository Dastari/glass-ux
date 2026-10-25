import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for richText. */
export const richTextMessages = defineMessages("richText", {
  useAnHttpsHttpMailtoTelOrRelative: "Use an https://, http://, mailto:, tel: or relative link",
  theUploadedFileNeedsASafeHttpSOr: "The uploaded file needs a safe HTTP(S) or relative URL",
  theFileCouldNotBeAttachedTryAgain: "The file could not be attached. Try again.",
  fileNotAttached: "File not attached",
  textFormatting: "Text formatting",
  paragraph: "Paragraph",
  blockStyle: (value0: unknown) => `Block style: ${value0}`,
  bold: "Bold",
  b: "B",
  italic: "Italic",
  inlineCode: "Inline code",
  strikethrough: "Strikethrough",
  s: "S",
  bulletList: "Bullet list",
  numberedList: "Numbered list",
  taskList: "Task list",
  editLink: "Edit link",
  link: "Link",
  linkAddress: "Link address",
  httpsExampleCom: "https://example.com",
  applyLink: "Apply link",
  openLink: "Open link",
  removeLink: "Remove link",
  undo: "Undo",
  redo: "Redo",
  attachFile: "Attach file",
  fileAttachment: "File attachment",
  writeADocument: "Write a document…",
  documentView: "Document view",
  loadingFormatting: "Loading formatting",
  loadingDocumentView: "Loading document view",
  keepTheDocumentWithinCharacters: (value0: unknown) => `Keep the document within ${value0} characters`,
  writeADocument2: "Write a document",
  linkHint: "Use HTTP(S), mailto:, tel:, a relative path, query or #anchor.",
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  quote: 'Quote',
  codeBlock: 'Code block',
  visual: 'Visual',
  markdown: 'Markdown',
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    richText: typeof richTextMessages.defaults
  }
}

/** Resolve richText wording outside React; pass the component's locale. */
export function getRichTextMessages(locale = getLocale()): typeof richTextMessages.defaults {
  return resolveMessages(richTextMessages.namespace, richTextMessages.defaults, locale)
}
