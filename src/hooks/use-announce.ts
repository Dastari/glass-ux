import { useEffect } from "react"
import { announce, retainAnnouncer, type AnnounceOptions } from "../lib/announce.js"

export type { AnnounceOptions }

/** Sends a message to the shared polite live region. */
export type Announce = (message: string, options?: AnnounceOptions) => void

/**
 * Announce outcomes to assistive technology through one shared, always-mounted polite live
 * region (R20.9), instead of hand-building an `aria-live` element in every component. The
 * region is created when the first component using the hook mounts and removed after the last
 * one unmounts, so the first message is not lost to a region that appeared with its text.
 *
 * - The region lives where the person is: inside the full-screen element, else the topmost
 *   modal dialog, else the body. A region at the end of the body would be inert behind a modal
 *   dialog and not drawn in full screen. The place is chosen when the message is spoken.
 * - Sending the same message twice announces it twice.
 * - Messages sent within about 150 ms are spoken together, in order. Pass a `key` for state that
 *   changes in bursts (a result count, a progress step): a newer message with the same key
 *   replaces the waiting one. Identical messages in one burst are spoken once.
 * - On the server it does nothing and renders nothing; the region exists on the client only.
 *
 * Words are the caller's: pass text built from a message of the component, never a fragment.
 * Do not use it for ticking text such as a countdown. The returned function never changes.
 *
 * @example
 * const announce = useAnnounce()
 * announce(messages.moved(card.title, column.title))
 * announce(messages.results(count), { key: "results" })
 */
export function useAnnounce(): Announce {
  useEffect(() => retainAnnouncer(), [])
  return announce
}
