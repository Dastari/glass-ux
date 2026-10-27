import { useMessages } from "../../lib/i18n/index.js"
import { dragDropMessages } from "./messages.js"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { IconGrip } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { createAnnouncements, DragDropManager, type ActiveDrag, type DraggableRecord, type ZoneRecord } from "./manager.js"
import type { DragDropAnnouncements, DragDropCallbacks, DragInfo, DraggableOptions, DropZoneOptions, DropZoneState } from "./types.js"

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

interface ProviderContext {
  manager: DragDropManager
  /** The id of the keyboard instructions every handle is described by. */
  instructionsId: string
}

const DragDropContext = createContext<ProviderContext | null>(null)
const ZoneIdContext = createContext<string | null>(null)

/** Whether a DragDropProvider is above (internal: components that bring their own when there is none). */
export function useHasDragDropProvider(): boolean {
  return useContext(DragDropContext) !== null
}

function useProvider(name: string): ProviderContext {
  const context = useContext(DragDropContext)
  if (!context) throw new Error(`${name} must be inside a DragDropProvider.`)
  return context
}

/* ── Provider ─────────────────────────────────────────────────────────────────────── */

/** Props for {@link DragDropProvider}. */
export interface DragDropProviderProps extends DragDropCallbacks {
  /** Everything that drags or takes drops. */
  children?: ReactNode
  /** Replace any of the screen reader messages. */
  announcements?: Partial<DragDropAnnouncements>
  /** The keyboard instructions every handle is described by. */
  instructions?: string
  /** Scroll containers and the page while a pointer drag nears their edges. Default true. */
  autoScroll?: boolean
}

/**
 * The scope of a drag and drop system. Draggables and drop zones inside it can reach each
 * other; it owns the drag preview, the polite live region that announces lifts, moves and
 * drops, and the lifecycle callbacks for every drag in it (`onDragStart` … `onDragEnd`).
 * Put one around a screen or the whole application; providers do not exchange items.
 */
export function DragDropProvider({ children, announcements, instructions: instructionsProp, autoScroll = true, ...callbacks }: DragDropProviderProps) {
 const messages = useMessages(dragDropMessages)
 const instructions = instructionsProp ?? messages.dragInstructions
  const [manager] = useState(() => new DragDropManager())
  const instructionsId = useId()
  const announcer = useRef<HTMLSpanElement | null>(null)
  useIsoLayoutEffect(() => {
    manager.callbacks = callbacks
    manager.announcements = { ...createAnnouncements(messages), ...announcements }
    manager.autoScroll = autoScroll
    manager.announcer = announcer.current
  })
  useEffect(() => () => manager.destroy(), [manager])
  const active = useSyncExternalStore(manager.subscribeActive, manager.getActive, () => null)
  const context = useMemo(() => ({ manager, instructionsId }), [manager, instructionsId])
  return (
    <DragDropContext value={context}>
      {children}
      <span id={instructionsId} hidden>
        {instructions}
      </span>
      <span ref={announcer} className="fa-dnd-announcer" aria-live="polite" aria-atomic="true" />
      {active?.preview && active.previewHost ? createPortal(active.preview, active.previewHost) : null}
    </DragDropContext>
  )
}

/* ── Draggables ───────────────────────────────────────────────────────────────────── */

/** What {@link useDraggable} returns. */
export interface UseDraggableResult {
  /** Attach to the element that moves. */
  ref: (element: HTMLElement | null) => void
  /** Attach to a dedicated handle; without one the whole element is the handle. */
  handleRef: (element: HTMLElement | null) => void
  /** Spread on the handle (the element itself when there is no handle): focus, role and descriptions. */
  handleProps: {
    tabIndex: number
    role: "button"
    "aria-roledescription": string
    "aria-describedby": string
    "aria-disabled": true | undefined
    "aria-description": string | undefined
    "data-dnd-handle": ""
  }
  /** A dedicated handle is attached. */
  hasHandle: boolean
  /** This item is being dragged. */
  dragging: boolean
}

/**
 * Make any element draggable. The item carries `data` and a `type` that drop zones filter on;
 * inside a sortable DropZone it also takes part in the zone's order. Attach `ref` to the
 * element and spread `handleProps` on the element that starts the drag (or attach
 * `handleRef` to a grip). Mouse and pen drag past a small threshold; touch lifts after a
 * short press unless the handle is a grip; Space or Enter lifts with the keyboard.
 */
export function useDraggable<T = unknown>(options: DraggableOptions<T> & { grip?: boolean }): UseDraggableResult {
  const messages = useMessages(dragDropMessages)

  const { manager, instructionsId } = useProvider("useDraggable")
  const zoneId = useContext(ZoneIdContext)
  const record = useMemo<DraggableRecord>(() => manager.createDraggable(options.id, options as DraggableOptions<unknown>, zoneId), [manager, options.id]) // oxlint-disable-line react-hooks/exhaustive-deps -- the record lives as long as the id; options update below
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [handle, setHandle] = useState<HTMLElement | null>(null)
  useIsoLayoutEffect(() => {
    record.options = options as DraggableOptions<unknown>
    manager.draggableChanged(record, zoneId)
  })
  useIsoLayoutEffect(() => manager.registerDraggable(record), [manager, record])
  useIsoLayoutEffect(() => manager.attachDraggable(record, element, handle, options.grip ?? true), [manager, record, element, handle, options.grip])
  const subscribeDraggable = useCallback((listener: () => void) => manager.subscribeDraggable(record, listener), [manager, record])
  const dragging = useSyncExternalStore(
    subscribeDraggable,
    () => record.dragging,
    () => false
  )
  const { disabled } = options
  return {
    ref: setElement,
    handleRef: setHandle,
    handleProps: {
      tabIndex: 0,
      role: "button",
      "aria-roledescription": messages.draggable,
      "aria-describedby": instructionsId,
      "aria-disabled": disabled ? true : undefined,
      "aria-description": typeof disabled === "string" ? disabled : undefined,
      "data-dnd-handle": "",
    },
    hasHandle: handle !== null,
    dragging,
  }
}

interface DraggableContextValue {
  handleRef: (element: HTMLElement | null) => void
  handleProps: UseDraggableResult["handleProps"]
  label: string
  disabled: boolean
}

const DraggableContext = createContext<DraggableContextValue | null>(null)

/** What a Draggable's render function receives. */
export interface DraggableState {
  /** This item is being dragged (its place shows the gap; the preview follows the pointer). */
  dragging: boolean
}

/** Props for {@link Draggable}. */
export interface DraggableProps<T = unknown> extends DraggableOptions<T>, Omit<ComponentProps<"div">, "children" | "id" | "onDragStart" | "onDragEnd" | "draggable"> {
  /** The element to render instead of a div (`<li />`, `<article />`). */
  render?: ReactElement
  /** The item's content, or a function of its drag state. */
  children?: ReactNode | ((state: DraggableState) => ReactNode)
}

/**
 * Any element as a draggable object. Without a DragHandle inside, the whole element is the
 * handle: it takes focus, lifts with Space or Enter and, on touch, with a short press so the
 * list still scrolls. Buttons, links and fields inside keep their own behaviour. Inside a
 * sortable DropZone it is one of the zone's ordered items. While it is dragged it carries
 * `data-dnd-source` and its place stays reserved; `data-dnd-item` marks it for styling.
 */
export function Draggable<T = unknown>({ id, type, data, label, disabled, effect, preview, onDragStart, onDragEnd, render, className, children, ...rest }: DraggableProps<T>) {
  const draggable = useDraggable<T>({ id, type, data, label, disabled, effect, preview, onDragStart, onDragEnd })
  const context = useMemo<DraggableContextValue>(
    () => ({ handleRef: draggable.handleRef, handleProps: draggable.handleProps, label, disabled: Boolean(disabled) }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- handleProps is rebuilt each render from these
    [draggable.handleRef, label, disabled, draggable.handleProps["aria-describedby"]]
  )
  const content = typeof children === "function" ? children({ dragging: draggable.dragging }) : children
  const element = useRender({
    defaultTagName: "div",
    render,
    ref: draggable.ref,
    props: mergeProps<"div">(
      {
        className: cx("fa-dnd-item", className),
        "data-dnd-item": "",
        "data-dragging": draggable.dragging ? "" : undefined,
        "data-disabled": disabled ? "" : undefined,
        children: <DraggableContext value={context}>{content}</DraggableContext>,
      } as ComponentProps<"div">,
      draggable.hasHandle ? {} : (draggable.handleProps as ComponentProps<"div">),
      rest
    ),
  })
  return element
}

/** Props for {@link DragHandle}. */
export interface DragHandleProps extends Omit<ComponentProps<"button">, "children" | "type"> {
  /** The handle's accessible name. Default "Move <label>". */
  "aria-label"?: string
  /** The glyph. Default the grip icon. */
  children?: ReactNode
}

/**
 * A grip that starts its Draggable's drag, for items whose content is interactive or that
 * should not lift from anywhere. It is the keyboard control (Space or Enter lifts) and, on
 * touch, drags at once without a long press.
 */
export function DragHandle({ className, children, "aria-label": ariaLabel, ...rest }: DragHandleProps) {
  const messages = useMessages(dragDropMessages)

  const context = useContext(DraggableContext)
  if (!context) throw new Error("DragHandle must be inside a Draggable.")
  const { handleRef, handleProps, label } = context
  return (
    <button
      {...rest}
      {...handleProps}
      ref={handleRef}
      type="button"
      role={undefined}
      className={cx("fa-dnd-handle", className)}
      aria-label={ariaLabel ?? messages.move(label)}
    >
      {children ?? <IconGrip />}
    </button>
  )
}

/* ── Drop zones ───────────────────────────────────────────────────────────────────── */

/** What {@link useDropZone} returns. */
export interface UseDropZoneResult {
  /** Attach to the zone's element. */
  ref: (element: HTMLElement | null) => void
  /** The zone's state; `index` is only tracked with `trackIndex`. */
  state: DropZoneState
}

/**
 * Make any element a drop zone. Its state is also written to the element as
 * `data-drop-state` (idle, ready, disabled, error, pending), `data-drop-over` and
 * `data-drop-reason`, so CSS can style it without a re-render. Pass `trackState: false` when
 * nothing reads `state`, so the zone never re-renders during a drag. Pass `trackIndex` to re-render
 * as the insertion index changes; otherwise it re-renders only when the status changes.
 * Wrap the zone's content in `DropZoneScope` (DropZone does) so Draggables inside join it.
 */
export function useDropZone<T = unknown>(options: DropZoneOptions<T>, { trackIndex = false, trackState = true }: { trackIndex?: boolean; trackState?: boolean } = {}): UseDropZoneResult {
  const { manager } = useProvider("useDropZone")
  const zone = useMemo<ZoneRecord>(() => manager.createZone(options.id, options as DropZoneOptions<unknown>), [manager, options.id]) // oxlint-disable-line react-hooks/exhaustive-deps -- the record lives as long as the id; options update below
  const [element, setElement] = useState<HTMLElement | null>(null)
  useIsoLayoutEffect(() => {
    zone.options = options as DropZoneOptions<unknown>
    manager.zoneChanged(zone)
  })
  useIsoLayoutEffect(() => manager.registerZone(zone), [manager, zone])
  useIsoLayoutEffect(() => manager.attachZone(zone, element), [manager, zone, element])
  // Without trackState nothing re-renders during a drag: the zone's look comes from the
  // data attributes the manager writes.
  const subscribe = useCallback((listener: () => void) => (trackState ? manager.subscribeZone(zone, listener) : () => {}), [manager, zone, trackState])
  const state = useSyncExternalStore(
    subscribe,
    () => (trackState ? (trackIndex ? zone.state : zone.summary) : IDLE_STATE),
    () => IDLE_STATE
  )
  return { ref: setElement, state }
}

const IDLE_STATE: DropZoneState = { status: "idle", over: false, reason: null, item: null, index: null }

/** Props for {@link DropZoneScope}. */
export interface DropZoneScopeProps {
  /** The zone the Draggables inside belong to. */
  zoneId: string
  /** The zone's content. */
  children?: ReactNode
}

/** Draggables inside belong to `zoneId` (for zones built with `useDropZone`). */
export function DropZoneScope({ zoneId, children }: DropZoneScopeProps) {
  return <ZoneIdContext value={zoneId}>{children}</ZoneIdContext>
}

/** How a drop zone shows its states. */
export type DropZoneAppearance = "outline" | "fill" | "none"

/** Props for {@link DropZone}. */
export interface DropZoneProps<T = unknown> extends DropZoneOptions<T>, Omit<ComponentProps<"div">, "children" | "id" | "onDrop" | "onDragEnter" | "onDragLeave" | "onDragOver"> {
  /**
   * outline: a dashed accent edge on zones that take the item, solid with a tint when it is
   * over them, danger for errors. fill: the tint only. none: nothing at all, so the zone does
   * not look like one; style it from `data-drop-state` or the render function instead.
   */
  appearance?: DropZoneAppearance
  /** The element to render instead of a div (`<ul />`, `<section />`). */
  render?: ReactElement
  /** The zone's content, or a function of its state ("Drop to add", the reason). */
  children?: ReactNode | ((state: DropZoneState) => ReactNode)
}

/**
 * Any element as a place to drop objects. `accept` filters by item type, `validate` and
 * `disabled` refuse items reactively ("List is full"), and `sort` makes it an ordered list,
 * row or grid of the Draggables inside it: they part to open a gap where the item would land
 * and close up when one is lifted out. `onDrop` hands over the object and the source and
 * target positions; apply it to your data with `applyDrop`, `moveItem` or `insertItem`.
 */
export function DropZone<T = unknown>({
  id,
  label,
  accept,
  validate,
  disabled,
  sort,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  appearance = "outline",
  render,
  className,
  children,
  ...rest
}: DropZoneProps<T>) {
  const functional = typeof children === "function"
  const zone = useDropZone<T>({ id, label, accept, validate, disabled, sort, onDragEnter, onDragLeave, onDragOver, onDrop }, { trackIndex: functional, trackState: functional })
  const content = functional ? children(zone.state) : children
  return useRender({
    defaultTagName: "div",
    render,
    ref: zone.ref,
    props: mergeProps<"div">(
      {
        className: cx("fa-dnd-zone", className),
        "data-appearance": appearance,
        "data-sort": sort,
        children: <ZoneIdContext value={id}>{content}</ZoneIdContext>,
      } as ComponentProps<"div">,
      rest
    ),
  })
}

/* ── Observing ────────────────────────────────────────────────────────────────────── */

/**
 * Listen to every drag under the provider from anywhere inside it: for a status line, a
 * trash can that appears while dragging, or analytics. The callbacks may change each render.
 */
export function useDragDropMonitor(callbacks: DragDropCallbacks) {
  const { manager } = useProvider("useDragDropMonitor")
  const latest = useRef(callbacks)
  useIsoLayoutEffect(() => {
    latest.current = callbacks
  })
  useEffect(
    () =>
      manager.monitor({
        onDragStart: (event) => latest.current.onDragStart?.(event),
        onDragMove: (event) => latest.current.onDragMove?.(event),
        onDragOver: (event) => latest.current.onDragOver?.(event),
        onDrop: (event) => latest.current.onDrop?.(event),
        onDragCancel: (event) => latest.current.onDragCancel?.(event),
        onDragEnd: (event) => latest.current.onDragEnd?.(event),
      }),
    [manager]
  )
}

/** The drag in progress under the provider, or null. Re-renders when a drag starts and ends. */
export function useActiveDrag(): DragInfo | null {
  const { manager } = useProvider("useActiveDrag")
  const active: ActiveDrag | null = useSyncExternalStore(manager.subscribeActive, manager.getActive, () => null)
  return active?.info ?? null
}
