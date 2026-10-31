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

/** The first hit among a locale's candidate tags, best match first: the tag itself; the language with its likely script; a bare language's likely region; the language alone. */
function bestMatch<T>(tag: string, find: (candidate: string) => T | undefined): T | undefined {
  const exact = find(tag)
  if (exact) return exact
  const { language, script, region } = new Intl.Locale(tag).maximize()
  return (script ? find(`${language}-${script}`) : undefined) ?? (region && tag === language ? find(`${language}-${region}`) : undefined) ?? find(language)
}

/**
 * The registered pack for a locale: an exact match; the language with its likely script
 * ("zh-CN" → "zh-Hans", while "zh-TW" needs a "zh-Hant" pack); a bare language's likely region
 * ("pt" → "pt-BR"); then the language alone ("de-AT" → "de"); else none.
 */
export function messagePackFor(locale: string): MessagePack | undefined {
  const tag = canonicalLocale(locale)
  if (!tag) return undefined
  return bestMatch(tag, (candidate) => packs.get(candidate))
}

/** Loads one language pack: `() => import("glass-ux/i18n/de")`. */
export type MessagePackLoader = () => Promise<{ default: MessagePack }>

/**
 * Load and register the pack for `locale` from a map of language tag to loader, so a
 * bundler splits each language into its own chunk and only the one in use is fetched:
 *
 * ```ts
 * const packs = { de: () => import("glass-ux/i18n/de"), "pt-BR": () => import("glass-ux/i18n/pt-BR") }
 * await loadMessagePack(locale, packs)
 * ```
 *
 * The tag is matched as `messagePackFor` matches (exact, likely script, likely region,
 * language), so a "de" loader serves "de-AT". Resolves with the pack, or `undefined` when no
 * loader fits (English stays). A pack already registered under the matching key is returned
 * without loading again. A failing loader rejects and registers nothing. Components show
 * English until the pack arrives: await this before the first render or hydration, and
 * register the same pack on the server.
 */
export async function loadMessagePack(locale: string, loaders: Readonly<Record<string, MessagePackLoader>>): Promise<MessagePack | undefined> {
  const tag = canonicalLocale(locale)
  if (!tag) return undefined
  const byTag = new Map<string, MessagePackLoader>()
  for (const [key, load] of Object.entries(loaders)) {
    const known = canonicalLocale(key)
    if (known) byTag.set(known, load)
  }
  const match = bestMatch(tag, (candidate) => {
    const load = byTag.get(candidate)
    return load ? { key: candidate, load } : undefined
  })
  if (!match) return undefined
  const registered = packs.get(match.key)
  if (registered) return registered
  const { default: pack } = await match.load()
  registerMessagePack(pack)
  return pack
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
