import { defineMessages, plural, resolveMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

/** English defaults for reactionBar. */
export const reactionBarMessages = defineMessages("reactionBar", {
  reactions: "Reactions",
  addReaction: "Add reaction",
  reacted: ({ count, name }: { count: number; name: string }, locale = "en-US") =>
    plural(locale, count, {
      one: `${numberFormat(locale).format(count)} person reacted with ${name}`,
      other: `${numberFormat(locale).format(count)} people reacted with ${name}`,
    }),
  added: (name: string) => `Reacted with ${name}`,
  removed: (name: string) => `Reaction ${name} removed`,
  thumbsUp: "thumbs up",
  heart: "red heart",
  smile: "smiling face",
  party: "party popper",
  surprised: "surprised face",
  sad: "sad face",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    reactionBar: typeof reactionBarMessages.defaults
  }
}

/** Resolve reactionBar wording outside React; pass the component's locale. */
export function getReactionBarMessages(locale = getLocale()): typeof reactionBarMessages.defaults {
  return resolveMessages(reactionBarMessages.namespace, reactionBarMessages.defaults, locale)
}
