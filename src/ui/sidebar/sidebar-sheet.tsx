/**
 * The phone sheet a sidebar becomes below its mobile query. Sidebar loads this module only
 * when the sheet can appear, so applications that never reach the phone layout do not load
 * the Sheet (Base UI Drawer and the dialog surface). AppShell's section drawer uses it too.
 */
import type { ReactNode } from "react"
import { Sheet } from "../sheet/index.js"
import type { SidebarSide } from "./context.js"

export interface SidebarSheetProps {
  /** The edge it slides in from, following the reading direction. */
  side: SidebarSide
  open: boolean
  /** Called when a swipe, Esc or the scrim dismisses it (or anything else changes it). */
  onOpenChange: (open: boolean, event: Event | undefined) => void
  /** Names the sheet when no visible heading does. */
  label?: string | undefined
  className?: string | undefined
  children?: ReactNode
}

/** A small sheet from the sidebar's edge. */
export function SidebarSheet({ side, open, onOpenChange, label, className, children }: SidebarSheetProps) {
  return (
    <Sheet.Root side={side} open={open} onOpenChange={(next, details) => onOpenChange(next, details.event)}>
      <Sheet.Popup size="sm" aria-label={label} className={className}>
        {children}
      </Sheet.Popup>
    </Sheet.Root>
  )
}
