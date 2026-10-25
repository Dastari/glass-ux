import { canonicalLocale } from "../locale/locale.js"
import type { MessageOverrides, MessagePack, MessageSet } from "./catalog.js"

const packs = new Map<string, MessagePack>()
let configured: MessageOverrides = {}
let version = 0
const listeners = new Set<() => void>()

const notify = () => {
  version++
  for (const listener of listeners) listener()
}

/**
 * Make a language pack available. Components whose locale matches it (exactly, or by
 * language: a "de" pack serves "de-AT") show its messages. Register packs at start-up,
 * beside `configureLocale`; a later pack for the same tag replaces the earlier one.
 */
export function registerMessagePack(...list: MessagePack[]): void {
  for (const pack of list) {
    const tag = canonicalLocale(pack.locale)
    if (!tag) throw new RangeError(`registerMessagePack: "${pack.locale}" is not a valid BCP 47 language tag`)
    packs.set(tag, pack)
  }
  notify()
}

/** The registered pack for a locale: an exact match, then the language alone ("de-AT" → "de"), else none. */
export function messagePackFor(locale: string): MessagePack | undefined {
  const tag = canonicalLocale(locale)
  if (!tag) return undefined
  return packs.get(tag) ?? packs.get(tag.split("-")[0]!)
}

/**
 * The application's own wording, over the defaults and any language pack: product nouns
 * ("Workspace" for "Project"), or tone. Applies to every locale; pass `{}` to clear.
 */
export function configureMessages(overrides: MessageOverrides): void {
  configured = overrides
  notify()
}

/** The overrides last set with `configureMessages`. */
export function configuredMessages(): MessageOverrides {
  return configured
}

/** Subscribe to pack registrations and configured overrides (for `useMessages`). */
export function subscribeMessages(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Changes whenever a pack is registered or the overrides change. */
export function messagesVersion(): number {
  return version
}

/**
 * A namespace's messages outside React: defaults, then the locale's pack, then the
 * configured overrides, then `extra`. Inside React, use `useMessages`.
 */
export function resolveMessages<Defaults extends MessageSet>(
  namespace: string,
  defaults: Defaults,
  locale: string,
  ...extra: Array<Partial<Defaults> | undefined>
): Defaults {
  const pack = messagePackFor(locale)?.messages as Record<string, Partial<Defaults> | undefined> | undefined
  const own = configured as Record<string, Partial<Defaults> | undefined>
  return Object.assign({}, defaults, pack?.[namespace], own[namespace], ...extra.filter(Boolean)) as Defaults
}
