import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip"
import { createContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react"

/**
 * Internal: one host per TooltipProvider shows every tooltip under it.
 *
 * A Base UI tooltip per trigger costs a store, a delay group member and hover, focus and
 * dismiss interactions on every mount, which is most of what a page of icon buttons costs to
 * mount. Here a Tooltip only marks its trigger (`data-fa-tooltip`) and registers its props;
 * the host listens once per document and runs the same rules Base UI's trigger does for
 * this library's configuration (TooltipProvider and Tooltip in tooltip.tsx):
 *
 *   hover    a mouse or pen resting 500 ms on a trigger opens it (once it has opened before,
 *            movement under 2px does not restart the rest); leaving closes it with its exit
 *            animation
 *   group    for 400 ms after a tooltip closes, and while one is open, the next opens at once
 *            without animating (data-instant="delay"); the one it replaces ends the same way
 *   focus    keyboard focus (:focus-visible) opens at once (data-instant="focus"); blur closes
 *   press    pressing an open trigger closes it (data-instant="dismiss") until the pointer
 *            leaves; focus stays closed until blur or leave, as after Escape
 *   Escape   closes it and carries on to the layer around it (the Root's own dismiss)
 *
 * Each visible bubble is still a Base UI Root (controlled) with the same positioner, popup,
 * arrow and transitions, anchored to its trigger.
 */
export interface TooltipEntry {
  /** The trigger, set by the Tooltip's ref. */
  element: HTMLElement | null
  /** Whether the tooltip may open (Tooltip `enabled`). */
  enabled: boolean
  /** The bubble for this trigger; `instant` is its data-instant when the host decides it. */
  render: (instant: Instant) => ReactNode
  /** Called when this trigger's tooltip opens or closes. */
  setShown: (shown: boolean) => void
}

export type Instant = "delay" | "focus" | "dismiss" | undefined

export interface TooltipHostApi {
  /** Add a trigger; returns its removal. */
  register: (key: string, entry: RefObject<TooltipEntry>) => () => void
  /** Redraw an open bubble whose props changed. */
  refresh: (key: string) => void
  /** Close a trigger's tooltip if it is open (it was disabled). */
  close: (key: string) => void
}

export const TooltipHostContext = createContext<TooltipHostApi | null>(null)

/** The trigger attribute a Tooltip under a host carries: its registry key. */
export const TOOLTIP_KEY = "data-fa-tooltip"

interface Slot {
  serial: number
  key: string
  element: HTMLElement
  open: boolean
  /** Created closed and opened in the next layout pass, so its Root sees it open (entrance). */
  entering?: boolean
  instant: Instant
}

interface Timings {
  /** Rest before the first tooltip opens. */
  delay: number
  /** How long after a close the next tooltip still opens at once. */
  timeout: number
}

const isMouseLike = (pointerType: string | undefined) =>
  pointerType === "mouse" || pointerType === "pen" || pointerType === "" || pointerType === undefined

function focusVisible(element: Element) {
  try {
    return element.matches(":focus-visible")
  } catch {
    return true
  }
}

export function TooltipHost({ delay, timeout, children }: Timings & { children: ReactNode }) {
  const registry = useRef(new Map<string, RefObject<TooltipEntry>>()).current
  const [slots, setSlots] = useState<readonly Slot[]>([])
  const [, setVersion] = useState(0)

  const machine = useMemo(() => {
    let serial = 0
    let current: Slot[] = []
    let hovered: HTMLElement | null = null
    let pointerType: string | undefined
    let restTimer: ReturnType<typeof setTimeout> | undefined
    let restPending = false
    let blockMouseMove = false
    let blockedFocus: HTMLElement | null = null
    let groupUntil = 0
    const documents = new Set<Document>()
    // Base UI ignores movement under 2px during the rest only once a trigger's tooltip has
    // opened (before that its Root has no reference element): the same here, per trigger.
    const opened = new WeakSet<Element>()

    const commit = (next: Slot[]) => {
      current = next
      setSlots(next)
    }
    const openSlot = () => current.find((slot) => slot.open || slot.entering)
    const groupActive = () => Boolean(openSlot()) || performance.now() < groupUntil
    const keyOf = (element: Element | null) => element?.getAttribute(TOOLTIP_KEY) ?? null
    const entryOf = (element: Element | null) => {
      const key = keyOf(element)
      return key ? registry.get(key)?.current : undefined
    }
    /** The nearest trigger registered with this host. */
    const triggerOf = (target: EventTarget | null): HTMLElement | null => {
      let element = target instanceof Element ? target.closest<HTMLElement>(`[${TOOLTIP_KEY}]`) : null
      while (element && !registry.has(keyOf(element)!)) element = element.parentElement?.closest<HTMLElement>(`[${TOOLTIP_KEY}]`) ?? null
      return element
    }
    const clearRest = () => {
      clearTimeout(restTimer)
      restPending = false
    }

    function open(element: HTMLElement, instant: Instant) {
      const key = keyOf(element)!
      const entry = registry.get(key)?.current
      if (!entry?.enabled) return
      const active = openSlot()
      if (active?.key === key) return
      const next = current.map((slot) => {
        if (slot !== active) return slot
        registry.get(slot.key)?.current.setShown(false)
        return { ...slot, open: false, instant: "delay" as const }
      })
      // Coming back to a trigger whose bubble is still leaving reopens that bubble.
      const leaving = next.find((slot) => slot.key === key && !slot.open)
      groupUntil = 0
      opened.add(element)
      entry.setShown(true)
      if (leaving) commit(next.map((slot) => (slot === leaving ? { ...slot, open: true, element, instant } : slot)))
      else commit([...next, { serial: ++serial, key, element, open: false, entering: true, instant }])
    }

    /** hover: the exit animates · focus: as it opened · dismiss: at once · escape: Base UI marks it. */
    function close(kind: "hover" | "focus" | "dismiss" | "escape", key = openSlot()?.key) {
      const target = current.find((slot) => (slot.open || slot.entering) && slot.key === key)
      if (!target) return
      registry.get(target.key)?.current.setShown(false)
      blockMouseMove = true
      groupUntil = performance.now() + timeout
      const instant = kind === "hover" ? undefined : kind === "dismiss" ? "dismiss" : kind === "escape" ? undefined : target.instant
      // A bubble closed before it opened is simply dropped.
      if (target.entering) commit(current.filter((slot) => slot !== target))
      else commit(current.map((slot) => (slot === target ? { ...slot, open: false, instant } : slot)))
    }

    const onPointerOver = (event: PointerEvent) => {
      pointerType = event.pointerType
      const trigger = triggerOf(event.target)
      if (!trigger || trigger === hovered) return
      if (event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget)) return
      hovered = trigger
      blockMouseMove = false
      if (!isMouseLike(pointerType) || !entryOf(trigger)?.enabled) return
      const active = openSlot()
      const leaving = current.some((slot) => !slot.open && slot.element === trigger && slot.instant === undefined)
      if ((active && active.element !== trigger) || (!active && groupActive()) || leaving) open(trigger, "delay")
    }

    const onPointerMove = (event: PointerEvent) => {
      pointerType = event.pointerType
      const trigger = hovered
      if (!trigger || !(event.target instanceof Node) || !trigger.contains(event.target)) return
      if (!isMouseLike(pointerType) || openSlot()?.element === trigger) return
      if (restPending && opened.has(trigger) && event.movementX ** 2 + event.movementY ** 2 < 2) return
      clearTimeout(restTimer)
      restPending = true
      restTimer = setTimeout(() => {
        restPending = false
        if (blockMouseMove || hovered !== trigger) return
        open(trigger, groupActive() ? "delay" : undefined)
      }, groupActive() ? 0 : delay)
    }

    const onPointerOut = (event: PointerEvent) => {
      const trigger = triggerOf(event.target)
      if (!trigger || trigger !== hovered) return
      if (event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget)) return
      hovered = null
      blockedFocus = null
      clearRest()
      // Straight onto another trigger: its pointerover switches the bubble.
      if (entryOf(triggerOf(event.relatedTarget))?.enabled) return
      if (openSlot()?.element === trigger) close("hover")
    }

    const onPointerDown = (event: PointerEvent) => {
      pointerType = event.pointerType
      const trigger = triggerOf(event.target)
      if (!trigger) return
      clearRest()
      if (openSlot()?.element === trigger) {
        close("dismiss")
        blockedFocus = trigger
      }
    }

    const onFocusIn = (event: FocusEvent) => {
      const trigger = triggerOf(event.target)
      if (!trigger || !entryOf(trigger)?.enabled) return
      if (blockedFocus === trigger) return
      blockedFocus = null
      if (event.target instanceof Element && !focusVisible(event.target)) return
      const active = openSlot()
      if (active?.element === trigger) return
      open(trigger, active || groupActive() ? "delay" : "focus")
    }

    const onFocusOut = (event: FocusEvent) => {
      const trigger = triggerOf(event.target)
      if (!trigger) return
      blockedFocus = null
      setTimeout(() => {
        if (openSlot()?.element !== trigger) return
        const focused = trigger.ownerDocument.activeElement
        if (focused && trigger.contains(focused)) return
        if (entryOf(triggerOf(focused))?.enabled) return
        close("focus")
      }, 0)
    }

    // Escape on the focused trigger of an open tooltip is handled there, as a Base UI trigger
    // handles it, so listeners further out see it already prevented. The Root closes it.
    const onKeyDown = (event: KeyboardEvent) => {
      const active = openSlot()
      if (event.key === "Escape" && active && event.target instanceof Node && active.element.contains(event.target)) event.preventDefault()
    }

    const listen = (doc: Document) => {
      if (documents.has(doc)) return
      documents.add(doc)
      doc.addEventListener("keydown", onKeyDown, true)
      doc.addEventListener("pointerover", onPointerOver, true)
      doc.addEventListener("pointermove", onPointerMove, { capture: true, passive: true })
      doc.addEventListener("pointerout", onPointerOut, true)
      doc.addEventListener("pointerdown", onPointerDown, true)
      doc.addEventListener("focusin", onFocusIn, true)
      doc.addEventListener("focusout", onFocusOut, true)
    }
    const stop = () => {
      clearRest()
      for (const doc of documents) {
        doc.removeEventListener("keydown", onKeyDown, true)
        doc.removeEventListener("pointerover", onPointerOver, true)
        doc.removeEventListener("pointermove", onPointerMove, true)
        doc.removeEventListener("pointerout", onPointerOut, true)
        doc.removeEventListener("pointerdown", onPointerDown, true)
        doc.removeEventListener("focusin", onFocusIn, true)
        doc.removeEventListener("focusout", onFocusOut, true)
      }
      documents.clear()
    }

    const api: TooltipHostApi = {
      register(key, entry) {
        registry.set(key, entry)
        const doc = entry.current.element?.ownerDocument
        if (doc) listen(doc)
        return () => {
          if (registry.get(key) !== entry) return
          registry.delete(key)
          // A trigger that goes away takes its bubble with it.
          if (current.some((slot) => slot.key === key)) commit(current.filter((slot) => slot.key !== key))
          if (hovered && keyOf(hovered) === key) hovered = null
        }
      },
      refresh() {
        setVersion((version) => version + 1)
      },
      close(key) {
        close("hover", key)
      },
    }
    return {
      api,
      listen,
      stop,
      /** Open the bubbles created closed in the last commit. */
      enter() {
        if (current.some((slot) => slot.entering)) commit(current.map((slot) => (slot.entering ? { ...slot, open: true, entering: false } : slot)))
      },
      onOpenChange(slot: Slot, open: boolean, details: { reason: string; allowPropagation: () => void }) {
        if (open) return
        if (details.reason === "escape-key") {
          // Escape closes the tooltip and carries on to the layer around it.
          details.allowPropagation()
          blockedFocus = slot.element
          close("escape", slot.key)
        } else close("focus", slot.key)
      },
      onOpenChangeComplete(slot: Slot, open: boolean) {
        if (open) return
        const settled = current.find((candidate) => candidate.serial === slot.serial)
        if (settled && !settled.open) commit(current.filter((candidate) => candidate !== settled))
      },
    }
  }, [registry, delay, timeout])

  useLayoutEffect(() => {
    machine.listen(document)
    return machine.stop
  }, [machine])
  useLayoutEffect(() => machine.enter(), [machine, slots])

  return (
    <TooltipHostContext value={machine.api}>
      {children}
      {slots.map((slot) => (
        <BaseTooltip.Root
          key={slot.serial}
          open={slot.open}
          disableHoverablePopup
          onOpenChange={(open, details) => machine.onOpenChange(slot, open, details)}
          onOpenChangeComplete={(open) => machine.onOpenChangeComplete(slot, open)}
        >
          {registry.get(slot.key)?.current.render(slot.instant)}
        </BaseTooltip.Root>
      ))}
    </TooltipHostContext>
  )
}
