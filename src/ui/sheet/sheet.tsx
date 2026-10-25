import { Drawer } from "@base-ui/react/drawer"
import { createContext, useContext, type ReactNode, type RefObject } from "react"
import { Dialog, DialogSurface, type DialogChangeDetails } from "../dialog/index.js"
import { useDirection } from "../../lib/locale/direction.js"

export type SheetSize = "sm" | "md" | "lg"
/** The edge a sheet slides in from, and the direction a swipe dismisses it. */
export type SheetSide = "left" | "right" | "bottom" | "start" | "end"

type PhysicalSide = Exclude<SheetSide, "start" | "end">
const SWIPE: Record<PhysicalSide, "left" | "right" | "down"> = { left: "left", right: "right", bottom: "down" }

const SideContext = createContext<PhysicalSide>("right")

export interface SheetRootProps {
  open?: boolean
  defaultOpen?: boolean
  /** Called with the next open state and Base UI change details (the reason; `details.cancel()` keeps it open) when the trigger opens it or a swipe, Esc, the scrim or a close control dismisses it. Pair with `open` to control it. */
  onOpenChange?: (open: boolean, details: DialogChangeDetails) => void
  /** Called with the final open state once the slide-in or slide-out animation has finished. */
  onOpenChangeComplete?: (open: boolean) => void
  /** Whether the overlay traps focus and makes outside content inert. */
  modal?: boolean
  /**
   * `right` (default): inspector and secondary detail. `left`: the section drawer on
   * tablets and phones. `bottom`: a short list of choices or actions (phone "More").
   * `start` and `end` follow DirectionProvider; `left` and `right` stay physical.
   */
  side?: SheetSide
  /** Ref exposing the component’s imperative action contract. */
  actionsRef?: RefObject<{ unmount: () => void; close: () => void } | null>
  children?: ReactNode
}

/** A pane from a screen edge: swipe toward that edge (or Esc, or the scrim) to dismiss. */
function SheetRoot({ side = "right", ...props }: SheetRootProps) {
  const rtl = useDirection() === "rtl"
  const edge = side === "start" ? (rtl ? "right" : "left") : side === "end" ? (rtl ? "left" : "right") : side
  return (
    <SideContext value={edge}>
      <Drawer.Root swipeDirection={SWIPE[edge]} {...props} />
    </SideContext>
  )
}

export interface SheetPopupProps {
  /** Width: sm 360 · md 480 · lg 640. Side sheets keep a sliver of the page visible on
   *  phones; a bottom sheet spans the phone's width. */
  size?: SheetSize
  className?: string
  children?: ReactNode
  /** Accessible name when a visible label does not name the control. */
  "aria-label"?: string
}

/**
 * A glass pane from the sheet's edge: the inspector (right), the section drawer (left) or
 * a short list of choices (bottom, with a grab handle). Same header, scrolling body and
 * footer as Dialog; the edges it touches respect the safe area.
 */
function SheetPopup({ size = "md", ...rest }: SheetPopupProps) {
  const side = useContext(SideContext)
  return <DialogSurface {...rest} mode="side" kind="side" size={size} edge={side} />
}

/**
 * A pane that slides in from a screen edge, built from parts: `Root` (state and `side`),
 * `Trigger`, `Popup`, `Header`, `Body` (scrolls), `Footer` and `Close`. Swipe toward the
 * edge, Esc or the scrim dismisses it.
 */
export const Sheet = {
  Root: SheetRoot,
  Trigger: Drawer.Trigger,
  Popup: SheetPopup,
  Header: Dialog.Header,
  Body: Dialog.Body,
  Footer: Dialog.Footer,
  Close: Drawer.Close,
}
