import { numberFormat } from "../../lib/locale/intl.js"
import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for avatar. */
export const avatarMessages = defineMessages("avatar", {
  online: "Online",
  away: "Away",
  busy: "Busy",
  offline: "Offline",
  more: (count: number, names: string) => `${count} more: ${names}`,
  people: (count: number, locale = "en-US") => plural(locale, count, { one: `${numberFormat(locale).format(count)} person`, other: `${numberFormat(locale).format(count)} people` }),
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    avatar: typeof avatarMessages.defaults
  }
}

/** Resolve avatar wording outside React; pass the component's locale. */
export function getAvatarMessages(locale = getLocale()): typeof avatarMessages.defaults {
  return resolveMessages(avatarMessages.namespace, avatarMessages.defaults, locale)
}

/** English defaults for EditableAvatar and AvatarDialog. */
export const avatarEditorMessages = defineMessages("avatarEditor", {
  changePhoto: "Change photo",
  changePhotoFor: (name: string) => `Change photo for ${name}`,
  cropRole: "photo crop",
  cropLabel: "Photo position",
  cropInstructions: "Drag, or use the arrow keys, to move the photo. Plus and minus zoom; 0 fits the whole photo.",
  zoom: "Zoom",
  choosePhoto: "Choose a photo",
  dropPhoto: "Drop to use this photo",
  choosePhotoFirst: "Choose a photo first",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  notSaved: "Not saved",
  cancel: "Cancel",
  removePhoto: "Remove photo",
  removing: "Removing…",
  savingPhoto: "Saving photo",
  saveFailed: "The photo could not be saved.",
  removeFailed: "The photo could not be removed.",
  anyImage: "any image",
  notSupported: (name: string, formats: string) => `${name} is not a supported image. Use ${formats}.`,
  tooLarge: (name: string, size: string) => `${name} is larger than ${size}.`,
  unreadable: (name: string) => `${name} could not be opened as an image.`,
  tooSmall: (width: string, height: string) => `The photo must be at least ${width} × ${height} pixels.`,
  maxFileSize: (size: string) => `Max ${size}`,
  minPixels: (width: string, height: string) => `At least ${width} × ${height} px`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    avatarEditor: typeof avatarEditorMessages.defaults
  }
}

/** Resolve avatar editor wording outside React; pass the component's locale. */
export function getAvatarEditorMessages(locale = getLocale()): typeof avatarEditorMessages.defaults {
  return resolveMessages(avatarEditorMessages.namespace, avatarEditorMessages.defaults, locale)
}
