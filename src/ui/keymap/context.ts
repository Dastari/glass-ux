import { createContext, use, useCallback, useSyncExternalStore } from "react"
import type { ShortcutDispatcher } from "./dispatcher.js"

/** The provider's dispatcher, or null with no KeymapProvider above. Menus read it optionally. */
export const KeymapContext = /* @__PURE__ */ createContext<ShortcutDispatcher | null>(null)

const noSubscribe = () => () => {}

/**
 * The first shortcut in effect for a command, as menus and palette rows show it: what the
 * person rebound it to, or `fallback` while nothing else is known. Undefined when they
 * unbound it. Works with no KeymapProvider above, returning `fallback`.
 */
export function useCommandKeys(id: string | undefined, fallback?: string): string | undefined {
  const dispatcher = use(KeymapContext)
  const read = useCallback(() => {
    if (!dispatcher || id === undefined || !dispatcher.has(id)) return fallback
    return dispatcher.keysFor(id)[0]
  }, [dispatcher, id, fallback])
  return useSyncExternalStore(dispatcher?.subscribe ?? noSubscribe, read, () => fallback)
}
