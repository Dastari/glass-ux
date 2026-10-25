import { useCallback, useSyncExternalStore } from "react"

/**
 * Whether a media query matches. The server (and the first client render) assumes
 * `serverValue`, then the client corrects itself after hydration.
 *
 * Only viewport-level overlays use this — dialogs become sheets and toasts move to the
 * top on phones because they are positioned against the viewport, not a container
 * (R7.1, R21.1). Everything inside a surface uses `@container` instead.
 * @example
 * const reduced = useMediaQuery("(prefers-reduced-motion: reduce)")
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = mediaList(query)
      list.addEventListener("change", notify)
      return () => list.removeEventListener("change", notify)
    },
    [query]
  )
  return useSyncExternalStore(subscribe, () => mediaList(query).matches, () => serverValue)
}

/**
 * Internal: one MediaQueryList per query for the page, so reading a query on every render
 * (or every pointer frame) does not parse and evaluate it again. Rebuilt if matchMedia is
 * replaced (tests).
 */
const lists = new Map<string, MediaQueryList>()
let source: typeof matchMedia | undefined
export function mediaList(query: string): MediaQueryList {
  if (source !== matchMedia) {
    lists.clear()
    source = matchMedia
  }
  let list = lists.get(query)
  if (!list) lists.set(query, (list = matchMedia(query)))
  return list
}

/** The phone breakpoint from tailwind-theme.css (--breakpoint-md, 48rem). */
export const PHONE_QUERY = "(width < 48rem)"

/** Whether the viewport is phone-sized (narrower than 48rem); `false` on the server and the first client render. For viewport-positioned overlays only. */
export function usePhoneLayout() {
  return useMediaQuery(PHONE_QUERY)
}
