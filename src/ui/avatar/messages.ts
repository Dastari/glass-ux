import { numberFormat } from "../../lib/locale/intl.js"
import { defineMessages, resolveMessages, plural } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for avatar. */
export const avatarMessages = defineMessages("avatar", {
  online: "Online",
  away: "Away",
  busy: "Busy",
  offline: "Offline",
  more: (value0: unknown, value1: unknown) => `${value0} more: ${value1}`,
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
