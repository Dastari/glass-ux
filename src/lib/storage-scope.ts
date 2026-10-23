/**
 * A namespace for state a component remembers in storage (a split pane's size). A window host
 * sets it to the window's kind, so the same component in two kinds of window remembers two
 * things, and every window of one kind shares one.
 */
import { createContext, useContext } from "react"

export const StorageScopeContext = createContext<string | null>(null)

/** The nearest storage namespace ("window:<kind>" inside a window body), or null. */
export const useStorageScope = () => useContext(StorageScopeContext)
