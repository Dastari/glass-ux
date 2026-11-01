/**
 * One `div` per panel, created once and kept until the panel closes. React portals into it, so
 * React's position for the content never changes; moving a panel moves only this element.
 *
 * `moveBefore` keeps scroll, focus and iframes through a move. Without it (or across documents,
 * which it refuses) `insertBefore` runs and the restore step puts scroll and focus back in the
 * same task. Hidden tabs stay hidden in their slot, never parked elsewhere.
 *
 * A slot that React is about to remove hands its hosts to the parking element first: a ref's
 * cleanup runs while the slot is still in the document, and a host removed with its slot would
 * lose everything `moveBefore` keeps.
 */

interface Scroll {
  top: number
  left: number
}

interface Host {
  element: HTMLDivElement
  /** Scrolled descendants, kept current by a scroll listener because a hidden element reads 0 and a hidden tab moves too. */
  scrolls: Map<Element, Scroll>
  /** The element to give focus back to after a move that lost it. */
  focus: HTMLElement | null
}

type Mover = { moveBefore?: (node: Node, child: Node | null) => void }

/** Move with state where the browser can, and report whether it did. */
function moveWithState(slot: HTMLElement, element: HTMLElement) {
  const mover = (slot as Mover).moveBefore
  if (typeof mover !== "function" || !element.isConnected || !slot.isConnected) return false
  try {
    mover.call(slot, element, null)
    return true
  } catch {
    // Another document, which only a remount can reach.
    return false
  }
}

export class HostStore {
  private hosts = new Map<string, Host>()
  private count = 0
  private domIds = new Map<string, string>()
  /** Where hosts wait during a commit that removes their slot. */
  parking: HTMLElement | null = null

  constructor(private prefix: string) {}

  /** An id for an element that stands for a panel or node, safe in an IDREF list whatever the id holds. */
  domId(id: string) {
    let domId = this.domIds.get(id)
    if (!domId) {
      this.count += 1
      domId = `${this.prefix}-${this.count}`
      this.domIds.set(id, domId)
    }
    return domId
  }

  /** Whether a panel has mounted, so its host is in the document. */
  has(id: string) {
    return this.hosts.has(id)
  }

  /** The panel's element, created on first use. */
  hostFor(id: string): HTMLDivElement {
    const known = this.hosts.get(id)
    if (known) return known.element
    const element = document.createElement("div")
    element.className = "fa-pane-host"
    element.id = this.domId(`host:${id}`)
    element.dataset.panel = id
    const scrolls = new Map<Element, Scroll>()
    // Read when the content scrolls, so a move or a show has the position without walking it.
    element.addEventListener(
      "scroll",
      (event) => {
        const target = event.target
        if (!(target instanceof Element) || element.hidden) return
        if (target.scrollTop === 0 && target.scrollLeft === 0) scrolls.delete(target)
        else scrolls.set(target, { top: target.scrollTop, left: target.scrollLeft })
      },
      { capture: true, passive: true }
    )
    this.hosts.set(id, { element, scrolls, focus: null })
    return element
  }

  /** Name a panel's element: a tabpanel when its stack shows tabs. */
  describe(id: string, title: string, tabbed: boolean) {
    const element = this.hosts.get(id)?.element
    if (!element) return
    if (tabbed) {
      element.setAttribute("role", "tabpanel")
      element.setAttribute("aria-label", title)
    } else {
      element.removeAttribute("role")
      element.removeAttribute("aria-label")
    }
  }

  /** Forget a closed panel. */
  drop(id: string) {
    const host = this.hosts.get(id)
    if (!host) return
    host.element.remove()
    this.hosts.delete(id)
  }

  /** Forget every panel but `keep`. */
  dropExcept(keep: ReadonlySet<string>) {
    for (const id of this.hosts.keys()) if (!keep.has(id)) this.drop(id)
  }

  private keepFocus(host: Host) {
    const active = host.element.ownerDocument.activeElement
    if (active instanceof HTMLElement && host.element.contains(active)) host.focus = active
  }

  /** Everything scrolled now, for a move that will lose it: the listener may not have heard yet. */
  private keepScroll(host: Host) {
    const { element, scrolls } = host
    if (element.hidden) return
    for (const node of [element, ...element.querySelectorAll("*")]) {
      if (node.scrollTop !== 0 || node.scrollLeft !== 0) scrolls.set(node, { top: node.scrollTop, left: node.scrollLeft })
    }
  }

  private move(host: Host, slot: HTMLElement) {
    this.keepFocus(host)
    if (moveWithState(slot, host.element)) return
    this.keepScroll(host)
    slot.insertBefore(host.element, null)
  }

  /** The restore step: once per move or show, never per frame. */
  private restore(host: Host) {
    for (const [element, scroll] of host.scrolls) {
      if (!host.element.contains(element)) {
        host.scrolls.delete(element)
        continue
      }
      if (element.scrollTop !== scroll.top) element.scrollTop = scroll.top
      if (element.scrollLeft !== scroll.left) element.scrollLeft = scroll.left
    }
    const focus = host.focus
    host.focus = null
    if (focus?.isConnected && focus.ownerDocument.activeElement !== focus) focus.focus({ preventScroll: true })
  }

  /**
   * Put panels in a slot with one shown. Runs in a layout effect after each commit; what is
   * already in place stays untouched.
   */
  place(slot: HTMLElement, ids: readonly string[], shown: string | null) {
    for (const id of ids) {
      const host = this.hosts.get(id)
      if (!host) continue
      const { element } = host
      const moved = element.parentElement !== slot
      if (moved) this.move(host, slot)
      const hidden = id !== shown
      const revealed = element.hidden && !hidden
      if (element.hidden !== hidden) element.hidden = hidden
      if ((moved || revealed) && !hidden) this.restore(host)
    }
  }

  /** Hand a slot's hosts to the parking element while the slot is still in the document. */
  park(slot: HTMLElement) {
    const parking = this.parking
    if (!parking?.isConnected) return
    for (const host of this.hosts.values()) if (host.element.parentElement === slot) this.move(host, parking)
  }
}
