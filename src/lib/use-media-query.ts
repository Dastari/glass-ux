import { useCallback, useSyncExternalStore } from "react"

/**
 * Whether a media query matches. The server (and the first client render) assumes
 * `serverValue`, then the client corrects itself after hydration.
 *
 * Only viewport-level overlays use this — dialogs become sheets and toasts move to the
 * top on phones because they are positioned against the viewport, not a container
 * (R7.1, R21.1). Everything inside a surface uses `@container` instead.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = matchMedia(query)
      list.addEventListener("change", notify)
      return () => list.removeEventListener("change", notify)
    },
    [query]
  )
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => serverValue)
}

/** The phone breakpoint from tailwind-theme.css (--breakpoint-md, 48rem). */
export const PHONE_QUERY = "(width < 48rem)"

export function usePhoneLayout() {
  return useMediaQuery(PHONE_QUERY)
}
