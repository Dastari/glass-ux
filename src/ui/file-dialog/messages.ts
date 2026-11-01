import { defineMessages, plural, resolveMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for fileDialog. */
export const fileDialogMessages = defineMessages("fileDialog", {
  openTitle: "Open",
  openFilesTitle: "Open files",
  saveTitle: "Save as",
  open: "Open",
  opening: "Opening…",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  location: "Location",
  thisDevice: "This device",
  path: "Folder path",
  folders: "Folders",
  files: "Files",
  view: "View",
  listView: "List",
  gridView: "Grid",
  newFolder: "New folder",
  create: "Create",
  refresh: "Refresh",
  go: "Go",
  name: "Name",
  format: "Format",
  rename: "Rename",
  renameTitle: (name: string) => `Rename ${name}`,
  delete: "Delete",
  deleteTitle: (name: string) => `Delete ${name}?`,
  deleteFileBody: "This can't be undone.",
  deleteFolderBody: "Everything in this folder is deleted with it. This can't be undone.",
  replace: "Replace",
  replaceTitle: (name: string) => `Replace ${name}?`,
  replaceBody: (folder: string) => `A file with this name is already in ${folder}. Replacing it overwrites its contents.`,
  conflictTitle: (name: string) => `${name} changed while you were working`,
  conflictChanged: ({ modified, size }: { modified: string; size: string }) => `It was last changed ${modified} and is now ${size}.`,
  conflictChangedSize: (size: string) => `It is now ${size}.`,
  conflictChangedUnknown: "Someone else saved a newer version.",
  conflictGone: "The file was deleted or moved. Save it again, or choose another name.",
  saveAnyway: "Save anyway",
  saveCopy: "Save a copy",
  compare: "Compare",
  emptyFolder: "This folder is empty",
  noLocations: "No location here can be saved to",
  loadingMore: "Loading more",
  loadMoreFailed: "Couldn't load more",
  retry: "Retry",
  progress: "Progress",
  items: (count: number, locale = "en-US") =>
    plural(locale, count, {
      one: `${numberFormat(locale).format(count)} item`,
      other: `${numberFormat(locale).format(count)} items`,
    }),
  selected: (count: number, locale = "en-US") => `${numberFormat(locale).format(count)} selected`,
  folderItems: ({ folder, items }: { folder: string; items: string }) => `${folder}, ${items}`,
  opened: (name: string) => `${name} opened`,
  saved: (name: string) => `${name} saved`,
  canceled: "Cancelled",
  notAccepted: (accepted: string) => `Only ${accepted} can be opened here`,
  chooseFirst: "Select a file first",
  readDenied: "You can't open this",
  writeDenied: "You can't replace this file",
  folderDenied: "You can't save to this folder",
  createDenied: "You can't add to this folder",
  renameDenied: "You can't rename this",
  deleteDenied: "You can't delete this",
  nameRequired: "Enter a name",
  nameInvalid: "A name can't contain a slash, or be . or ..",
  nameTaken: (name: string) => `${name} is already here. Choose another name.`,
  isFolder: (name: string) => `${name} is a folder. Choose another name.`,
  isFile: (name: string) => `${name} is a file, not a folder`,
  errorNotFound: "This is no longer here. Go back and choose another place.",
  errorDenied: "You don't have access to this location.",
  errorUnavailable: "This location isn't available. Try again shortly.",
  errorChanged: "This changed while it was opening. Try again.",
  errorTooLarge: "This is too large for this location.",
  errorUnsupported: "This location can't do that.",
  errorFailed: "That didn't work. Try again.",
  errorList: "Couldn't load this folder. Try again.",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    fileDialog: typeof fileDialogMessages.defaults
  }
}

/** Resolve fileDialog wording outside React; pass the component's locale. */
export function getFileDialogMessages(locale = getLocale()): typeof fileDialogMessages.defaults {
  return resolveMessages(fileDialogMessages.namespace, fileDialogMessages.defaults, locale)
}
