import { useSyncExternalStore } from "react"
import { prefersReducedMotion } from "../../lib/motion.js"
import { mediaList } from "../../lib/use-media-query.js"

/** Follows Appearance's Still and the operating system's setting, the rule `prefersReducedMotion` applies. */
function subscribe(notify: () => void) {
  const list = mediaList("(prefers-reduced-motion: reduce)")
  list.addEventListener("change", notify)
  const watcher = new MutationObserver(notify)
  watcher.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] })
  return () => {
    list.removeEventListener("change", notify)
    watcher.disconnect()
  }
}

/** Whether interface motion is reduced now; updates when the person changes either setting. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => prefersReducedMotion(), () => false)
}
