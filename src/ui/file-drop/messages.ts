import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for fileDrop. */
export const fileDropMessages = defineMessages("fileDrop", {
  maxPerFile: (value0: unknown) => `Max ${value0} per file`,
  dropToAdd: "Drop to add",
  dropFilesHereOr: "Drop files here or ",
  dropAFileHereOr: "Drop a file here or ",
  browse: "browse",
  uploaded: (value0: unknown) => `${value0} uploaded`,
  uploadFailed: "Upload failed",
  failed: (value0: unknown, value1: unknown) => `${value0} failed: ${value1}`,
  uploading: "Uploading",
  waiting: "Waiting",
  uploaded2: "Uploaded",
  upload: (value0: unknown) => `${value0} upload`,
  remove: (value0: unknown) => `Remove ${value0}`,
  files: (value0: unknown) => `${value0} files`,
  or: (value0: unknown, value1: unknown) => `${value0} or ${value1}`,
  isNotAFile: (value0: unknown, value1: unknown) => `${value0} is not a ${value1} file`,
  isLargerThan: (value0: unknown, value1: unknown) => `${value0} is larger than ${value1}`,
  wasNotAddedTheLimitIs: (name: string, count: number, locale = "en-US") => plural(locale, count, { one: `${name} was not added — the limit is ${count} file`, other: `${name} was not added — the limit is ${count} files` }),
  moreNotAdded: (value0: unknown, value1: unknown) => `${value0} · ${value1} more not added`,
  filesLabel: "Files",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    fileDrop: typeof fileDropMessages.defaults
  }
}

/** Resolve fileDrop wording outside React; pass the component's locale. */
export function getFileDropMessages(locale = getLocale()): typeof fileDropMessages.defaults {
  return resolveMessages(fileDropMessages.namespace, fileDropMessages.defaults, locale)
}
