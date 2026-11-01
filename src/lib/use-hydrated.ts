import { useSyncExternalStore } from "react"

const noopSubscribe = () => () => {}

/**
 * False on the server and while hydrating, true afterwards (and from the start of a client
 * render). A boot script belongs only in server HTML: React never runs one it renders on the
 * client, and warns that it did.
 */
export const useHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
