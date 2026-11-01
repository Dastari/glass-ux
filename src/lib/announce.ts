/**
 * One shared, always-mounted polite live region (R20.9) for messages that no component of
 * their own owns: "3 results", "Moved to Done", "Saved". Components call it through
 * `useAnnounce`; this module keeps the region, so every message goes through the same node and
 * the first one is not lost to a region that appeared with its text.
 *
 * Where the region lives matters. A region at the end of `<body>` is inert while a modal dialog
 * is open (assistive technology ignores what the dialog hides; Base UI marks it inert) and is not drawn while an
 * element is full screen. So each message goes to a region inside the element the person is
 * actually in: the full-screen element, else the topmost modal dialog inside it, else the body.
 * The container is chosen when the message is sent, after the coalescing window, so a message
 * sent as a dialog closes lands where the person is by then.
 */

/** Messages within this window of each other are announced together. */
const COALESCE_MS = 150
/** A newly created region needs a moment to be known to assistive technology before it has text. */
const PRIME_MS = 120
/** Text left in the region is removed after this long, so a stale message is not found later. */
const CLEAR_MS = 5000

const NBSP = " "
const ATTRIBUTE = "data-fa-announcer"

/** Settings for one announcement. */
export interface AnnounceOptions {
  /**
   * A message with the same key as one still waiting replaces it: a count that changes five times
   * in a burst announces once, with the last value. Messages without a key are all announced.
   */
  key?: string
}

let users = 0
const pending = new Map<string, string>()
const regions = new Set<HTMLElement>()
let flushTimer: ReturnType<typeof setTimeout> | undefined
let clearTimer: ReturnType<typeof setTimeout> | undefined

/** The element a region should live in right now. */
function container(): HTMLElement {
  const full = document.fullscreenElement
  const root = full instanceof HTMLElement && full !== document.documentElement ? full : document.body
  // Base UI's modal dialogs set neither aria-modal nor `open`; they mark every other branch of the
  // body `data-base-ui-inert` while they are open, so a role="dialog" counts as modal then.
  const dialogs = document.querySelector("[data-base-ui-inert]") ? ', [role="dialog"]' : ""
  const modals = [...root.querySelectorAll<HTMLElement>(`dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"]${dialogs}`)].filter(
    (element) => element.isConnected && !element.hidden && !element.closest("[inert]") && (!(element instanceof HTMLDialogElement) || element.matches(":modal")),
  )
  // The last in document order is the topmost; a dialog opened from another sits after it.
  return modals.at(-1) ?? root
}

function region(host: HTMLElement): { node: HTMLElement; created: boolean } {
  const existing = host.querySelector<HTMLElement>(`:scope > [${ATTRIBUTE}]`)
  if (existing) return { node: existing, created: false }
  const node = document.createElement("div")
  node.setAttribute(ATTRIBUTE, "")
  node.setAttribute("role", "status")
  node.setAttribute("aria-live", "polite")
  node.setAttribute("aria-atomic", "true")
  node.className = "fa-visually-hidden"
  // Fixed, so a region inside a scrolling dialog never adds to its scroll area (in RTL too).
  node.style.position = "fixed"
  host.append(node)
  regions.add(node)
  return { node, created: true }
}

function prune() {
  for (const node of regions) if (!node.isConnected) regions.delete(node)
}

function join(messages: string[]) {
  return messages.reduce((text, message) => (text === "" ? message : `${text}${/[.!?…。！？]$/.test(text) ? " " : ". "}${message}`), "")
}

function write(node: HTMLElement, text: string) {
  // The same text again changes nothing in the DOM and so is not announced: alternate a
  // trailing no-break space, which is not spoken.
  node.textContent = node.textContent === text ? `${text}${NBSP}` : text
  clearTimeout(clearTimer)
  clearTimer = setTimeout(() => {
    for (const other of regions) other.textContent = ""
  }, CLEAR_MS)
}

function flush() {
  flushTimer = undefined
  if (typeof document === "undefined" || pending.size === 0) return
  const text = join([...pending.values()])
  pending.clear()
  prune()
  const { node, created } = region(container())
  // One region speaks at a time: silence the ones left behind in containers the person left.
  for (const other of regions) if (other !== node) other.textContent = ""
  if (created) setTimeout(() => write(node, text), PRIME_MS)
  else write(node, text)
}

/**
 * Announce `message` politely. Messages sent within a short window are spoken together, in
 * order, once: those with the same `key` collapse to the last, and identical text appears once.
 * Does nothing on the server. Prefer `useAnnounce`, which also keeps the region mounted.
 */
export function announce(message: string, { key }: AnnounceOptions = {}) {
  if (typeof document === "undefined" || message === "") return
  const slot = key ?? `\u0000${message}`
  if (key !== undefined) pending.delete(slot) // a replacement moves to the end: it is the latest news
  pending.set(slot, message)
  clearTimeout(flushTimer)
  flushTimer = setTimeout(flush, COALESCE_MS)
}

/** Mount the region (once, for everyone) and keep it while any component uses it; returns the release. */
export function retainAnnouncer(): () => void {
  users++
  if (typeof document !== "undefined") {
    region(container())
    document.addEventListener("fullscreenchange", prime)
  }
  return () => {
    users--
    // React re-runs an effect's cleanup and setup back to back (StrictMode, Fast Refresh):
    // only tear down when nothing came back.
    setTimeout(() => {
      if (users > 0 || typeof document === "undefined") return
      document.removeEventListener("fullscreenchange", prime)
      clearTimeout(flushTimer)
      clearTimeout(clearTimer)
      pending.clear()
      for (const node of regions) node.remove()
      regions.clear()
    }, 0)
  }
}

/** Entering or leaving full screen: have a region ready in the new container before the next message. */
function prime() {
  prune()
  region(container())
}
