import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { readingKey } from "../../lib/direction.js"
import { eventName, toneAttribute, useScheduler } from "./context.js"
import { editEvent, type EventEdit } from "./edit.js"
import type { PlacedEvent } from "./layout.js"

/**
 * How arrow keys edit a focused event:
 *   time   up/down move by the snap (Shift: the end), left/right by a day
 *   days   left/right by a day (Shift: the end, for bars)
 *   month  as days, and up/down by a week
 */
export type EditKeys = "time" | "days" | "month"

export interface EventButtonProps {
  placed: PlacedEvent
  variant: "block" | "bar" | "item" | "row"
  editKeys?: EditKeys
  className?: string
  style?: CSSProperties
  tabIndex?: number
  /** Begins a pointer move or resize. */
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void
  /** Keys the event does not use for editing. */
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void
  /** Extra state for styling. */
  data?: Record<`data-${string}`, string | undefined>
  children: ReactNode
}

/** An event as a button: its accessible name says what and when; Enter opens it, arrows edit it when editable. */
export function EventButton({ placed, variant, editKeys, className, style, tabIndex, onPointerDown, onKeyDown, data, children }: EventButtonProps) {
  const context = useScheduler()
  const editable = Boolean(editKeys) && context.canEdit(placed)

  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const edit = editable && !event.altKey && !event.metaKey && !event.ctrlKey && !(event.shiftKey && !context.canResize(placed)) ? keyEdit(readingKey(event.key, event.currentTarget), event.shiftKey, editKeys!, placed, context.snapMinutes) : null
    if (!edit) return onKeyDown?.(event)
    event.preventDefault()
    event.stopPropagation()
    const change = editEvent(placed, edit, context.timeZone, "keyboard")
    if (change) context.commit(change)
  }

  return (
    <button
      type="button"
      className={cx("fa-sch-ev", className)}
      data-variant={variant}
      data-tone={toneAttribute(placed)}
      data-event-id={placed.id}
      data-editable={editable ? "" : undefined}
      aria-label={eventName(placed, context)}
      aria-description={editable ? context.t.editHint : undefined}
      tabIndex={tabIndex}
      style={style}
      onPointerDown={editable ? onPointerDown : undefined}
      onClick={(event) => context.openEvent(placed, event.currentTarget)}
      onKeyDown={keyDown}
      {...data}
    >
      {children}
    </button>
  )
}

function keyEdit(key: string, shift: boolean, keys: EditKeys, placed: PlacedEvent, snap: number): EventEdit | null {
  const horizontal = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0
  const vertical = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0
  if (!horizontal && !vertical) return null
  if (keys === "time" && !placed.band) {
    if (vertical) return { kind: shift ? "resize" : "move", minutes: vertical * snap, snap }
    return shift ? null : { kind: "move", days: horizontal }
  }
  if (horizontal) return shift ? (placed.band ? { kind: "resize", days: horizontal } : null) : { kind: "move", days: horizontal }
  return keys === "month" && !shift ? { kind: "move", days: vertical * 7 } : null
}
