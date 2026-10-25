/**
 * Translatable messages: every word a component shows that the application does not pass in.
 *
 * Each component declares its English messages beside itself with `defineMessages`, under a
 * namespace, and adds that namespace to `MessageCatalog` by module augmentation:
 *
 *   // src/ui/pagination/messages.ts
 *   export const paginationMessages = defineMessages("pagination", {
 *     previous: "Previous page",
 *     pageStatus: (page: number, pages: number) => `Page ${page} of ${pages}`,
 *   })
 *   declare module "../../lib/i18n/catalog.js" {
 *     interface MessageCatalog { pagination: typeof paginationMessages.defaults }
 *   }
 *
 * A message is a string, or a function of its arguments when it interpolates or pluralises
 * (`plural` helps). Components read them with `useMessages(paginationMessages)`.
 *
 * Resolution, later wins: the English defaults; the language pack registered for the
 * component's locale (`registerMessagePack`); the application's `configureMessages`; the
 * nearest `MessagesProvider`; and finally a component's own `labels` prop where it has one.
 */

/** A message: text, or a function of its arguments that returns text. */
// biome-ignore lint/suspicious/noExplicitAny: messages take any argument list
export type Message = string | ((...args: any[]) => string)

/** A namespace's messages. */
export type MessageSet = Record<string, Message>

/**
 * Every namespace's messages, by namespace. Components extend it by module augmentation
 * (see the file comment), so packs and overrides are typed against the real messages.
 */
// biome-ignore lint/suspicious/noEmptyInterface: extended by module augmentation
export interface MessageCatalog {}

/** Any subset of the catalogue: some namespaces, some keys in each. */
export type MessageOverrides = { [Namespace in keyof MessageCatalog]?: Partial<MessageCatalog[Namespace]> }

/** A language pack: the catalogue in one language, for a BCP 47 tag ("de", "pt-BR"). */
export interface MessagePack {
  /** The language the pack is written in. A pack for "de" serves "de-CH"; "pt-BR" serves only "pt-BR". */
  locale: string
  /** The translated messages. Anything missing falls back to English. */
  messages: MessageOverrides
}

/** A namespace's English defaults, as returned by `defineMessages`. */
export interface MessageDescriptor<Namespace extends string, Defaults extends MessageSet> {
  namespace: Namespace
  defaults: Defaults
}

const registry = new Map<string, MessageDescriptor<string, MessageSet>>()

/** All message descriptors loaded by the application, keyed by namespace. Returns a snapshot. */
export function registeredMessages(): ReadonlyMap<string, MessageDescriptor<string, MessageSet>> {
  return new Map(registry)
}

/** Declare a component's English messages under a namespace (see the file comment). */
export function defineMessages<const Namespace extends string, Defaults extends MessageSet>(
  namespace: Namespace,
  defaults: Defaults,
): MessageDescriptor<Namespace, Defaults> {
  const descriptor = { namespace, defaults }
  registry.set(namespace, descriptor)
  return descriptor
}

/** Write a language pack with its messages typed against the catalogue. */
export function defineMessagePack(locale: string, messages: MessageOverrides): MessagePack {
  return { locale, messages }
}

/**
 * Choose a plural form with the locale's rules: `plural(locale, n, { one: "1 row", other: `${n} rows` })`.
 * Forms not given fall back to `other`.
 */
export function plural(locale: string, count: number, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }): string {
  const rule = new Intl.PluralRules(locale).select(count)
  return forms[rule] ?? forms.other
}
