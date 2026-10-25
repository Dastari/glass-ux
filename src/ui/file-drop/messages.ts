import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for fileDrop. */
export const fileDropMessages = defineMessages("fileDrop", {
  maxPerFile: (size: string) => `Max ${size} per file`,
  dropToAdd: "Drop to add",
  browseFiles: (browse: string) => `Drop files here or ${browse}`,
  browseFile: (browse: string) => `Drop a file here or ${browse}`,
  browse: "browse",
  uploaded: (name: string) => `${name} uploaded`,
  uploadFailed: "Upload failed",
  failed: (name: string, reason: string) => `${name} failed: ${reason}`,
  uploading: "Uploading",
  waiting: "Waiting",
  uploadedStatus: "Uploaded",
  upload: (name: string) => `${name} upload`,
  remove: (name: string) => `Remove ${name}`,
  files: (type: string) => `${type} files`,
  isNotAFile: (name: string, type: string) => `${name} is not a ${type} file`,
  isLargerThan: (name: string, size: string) => `${name} is larger than ${size}`,
  wasNotAddedTheLimitIs: ({ name, count, locale = "en-US" }: { name: string; count: number; locale?: string }) => plural(locale, count, { one: `${name} was not added — the limit is ${count} file`, other: `${name} was not added — the limit is ${count} files` }),
  moreNotAdded: (reason: string, count: number) => `${reason} · ${count} more not added`,
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
