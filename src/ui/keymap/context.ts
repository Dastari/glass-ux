import { createContext, use, useCallback, useMemo, useSyncExternalStore } from "react"
import type { CommandBinding, ShortcutDispatcher } from "./dispatcher.js"

/** The provider's dispatcher, or null with no KeymapProvider above. Menus read it optionally. */
export const KeymapContext = /* @__PURE__ */ createContext<ShortcutDispatcher | null>(null)

const noSubscribe = () => () => {}
const NO_VERSION = () => 0
const asKeys = (fallback: string | readonly string[] | undefined): readonly string[] => (fallback === undefined ? [] : typeof fallback === "string" ? [fallback] : fallback)
const unbound = (fallback: string | readonly string[] | undefined): CommandBinding => {
  const keys = asKeys(fallback)
  return { keys, primary: keys[0], rebound: false, scoped: false }
}

/**
 * A function that looks up any command's binding, for a list of rows built from data (a
 * menu bar). It changes when a binding does, so pass it to what renders them. Looking up
 * registers nothing and adds no listener; with no KeymapProvider above, it returns `fallback`.
 *
 * @example
 * const lookup = useBindingLookup()
 * const keys = lookup(action.commandId, action.definition.shortcut).primary
 */
export function useBindingLookup(): (id: string | undefined, fallback?: string | readonly string[]) => CommandBinding {
  const dispatcher = use(KeymapContext)
  const version = useSyncExternalStore(dispatcher?.subscribe ?? noSubscribe, dispatcher?.getVersion ?? NO_VERSION, NO_VERSION)
  return useMemo(() => {
    void version
    return (id, fallback) => (dispatcher && id !== undefined ? dispatcher.bindingFor(id, asKeys(fallback)) : unbound(fallback))
  }, [dispatcher, version])
}

/**
 * One command's binding as it stands: rebound or default, chords included, and whether it is
 * scoped elsewhere. Pass an action's `commandId` and `definition.shortcut`. Show it with
 * `Kbd`, or `shortcut` on a menu row. Display only: this never registers the shortcut.
 */
export function useCommandBinding(id: string | undefined, fallback?: string | readonly string[]): CommandBinding {
  const lookup = useBindingLookup()
  const read = useCallback(() => lookup(id, fallback), [lookup, id, fallback])
  return read()
}

/** The first shortcut in effect for a command, or undefined when it has none. See {@link useCommandBinding}. */
export function useCommandKeys(id: string | undefined, fallback?: string): string | undefined {
  return useCommandBinding(id, fallback).primary
}
