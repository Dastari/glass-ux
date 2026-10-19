import { useCallback, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type Ref } from "react"
import { cx } from "../../lib/cx.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { nearestTimeIndex, secondsToTime, timeToSeconds, type TimeValue } from "./time.js"

const TYPEAHEAD_RESET = 700
/** Rows rendered beyond each edge of the view. */
const OVERSCAN = 8

export interface TimeListProps {
  /** The times offered, in order. */
  times: readonly TimeValue[]
  /** The chosen time, marked selected; null when none. */
  value: TimeValue | null
  /** With no value, the list opens at the time nearest this one. */
  near?: TimeValue
  /** A time as shown in a row ("9:30 am"). */
  format: (time: TimeValue) => string
  /** Called when a row is chosen by click, Enter or Space. */
  onPick: (time: TimeValue) => void
  /** Focus the list when it mounts (popups). */
  autoFocus?: boolean
  /** Accessible name of the list. */
  "aria-label"?: string
  /** Receives the listbox element, for focus. */
  listRef?: Ref<HTMLDivElement>
  className?: string
}

const normalise = (text: string) => text.toLowerCase().replace(/[\s:.]/g, "")

/**
 * A windowed listbox of times. Only the rows in view are rendered, so a list of every minute
 * stays light. The highlighted row is the active descendant: arrows move it, Page Up and Page
 * Down move an hour, Home and End go to the ends, typing jumps ("9", "93" → 9:30 am), and
 * Enter or Space picks. It opens scrolled to the chosen time, or the nearest one.
 */
export function TimeList({ times, value, near, format, onPick, autoFocus, "aria-label": label = "Times", listRef, className }: TimeListProps) {
  const id = useId()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const probeRef = useRef<HTMLDivElement>(null)
  const rowHeight = useElementSize(probeRef).height || 36
  const startAt = useCallback(() => {
    const target = value ?? near
    if (target && times.includes(target)) return times.indexOf(target)
    return Math.max(0, target ? nearestTimeIndex(times, target) : 0)
  }, [times, value, near])
  const [active, setActive] = useState(startAt)

  // A new list (another day's bounds) or a new value starts again from the value.
  const key = `${times.length}|${times[0]}|${times.at(-1)}|${value}`
  const [shownKey, setShownKey] = useState(key)
  if (shownKey !== key) {
    setShownKey(key)
    setActive(startAt())
  }

  // Fixed rows, so the window is arithmetic: the rows in view plus an overscan either side.
  // State changes only when the first row in view changes, not on every scrolled pixel.
  const viewHeight = useElementSize(scrollRef, { box: "client" }).height || rowHeight * 8
  const [firstInView, setFirstInView] = useState(0)
  const onScroll = () => {
    const first = Math.floor((scrollRef.current?.scrollTop ?? 0) / rowHeight)
    if (first !== firstInView) setFirstInView(first)
  }
  const scrollToIndex = (index: number, align: "center" | "auto") => {
    const node = scrollRef.current
    if (!node) return
    const top = index * rowHeight
    const height = node.clientHeight || viewHeight
    if (align === "center") node.scrollTop = Math.max(0, top - (height - rowHeight) / 2)
    else if (top < node.scrollTop) node.scrollTop = top
    else if (top + rowHeight > node.scrollTop + height) node.scrollTop = top + rowHeight - height
    onScroll()
  }

  // Open at the chosen (or nearest) time, centred.
  useLayoutEffect(() => {
    scrollToIndex(startAt(), "center")
    if (autoFocus) scrollRef.current?.focus({ preventScroll: true })
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once per list, after the row height is known
  }, [rowHeight, shownKey])

  const moveTo = (index: number) => {
    const next = Math.min(times.length - 1, Math.max(0, index))
    setActive(next)
    scrollToIndex(next, "auto")
  }

  const byHour = (direction: 1 | -1) => {
    const current = times[active]
    if (!current) return active
    const target = Math.min(86_399, Math.max(0, timeToSeconds(current) + direction * 3600))
    const index = nearestTimeIndex(times, secondsToTime(target, true))
    return index === active ? active + direction : index
  }

  const buffer = useRef({ text: "", timer: 0 as ReturnType<typeof setTimeout> | 0 })
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
        moveTo(active + 1)
        break
      case "ArrowUp":
        moveTo(active - 1)
        break
      case "PageDown":
        moveTo(byHour(1))
        break
      case "PageUp":
        moveTo(byHour(-1))
        break
      case "Home":
        moveTo(0)
        break
      case "End":
        moveTo(times.length - 1)
        break
      case "Enter":
      case " ": {
        const time = times[active]
        if (time) onPick(time)
        break
      }
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey || /[\s:.]/.test(event.key)) return
        clearTimeout(buffer.current.timer)
        buffer.current.text += event.key.toLowerCase()
        buffer.current.timer = setTimeout(() => (buffer.current.text = ""), TYPEAHEAD_RESET)
        const query = buffer.current.text
        const from = query.length > 1 ? active : active + 1
        for (let offset = 0; offset < times.length; offset += 1) {
          const index = (from + offset) % times.length
          if (normalise(format(times[index]!)).startsWith(query)) {
            moveTo(index)
            break
          }
        }
      }
    }
    event.preventDefault()
  }

  const setRefs = (node: HTMLDivElement | null) => {
    scrollRef.current = node
    if (typeof listRef === "function") listRef(node)
    else if (listRef) listRef.current = node
  }

  if (!times.length) {
    return (
      <div className={cx("fa-time-list fa-time-list-empty", className)} ref={setRefs}>
        No times available
      </div>
    )
  }

  // The highlighted row is always rendered, so the active descendant always exists.
  const from = Math.max(0, firstInView - OVERSCAN)
  const to = Math.min(times.length - 1, firstInView + Math.ceil(viewHeight / rowHeight) + OVERSCAN)
  const indexes = Array.from({ length: to - from + 1 }, (_, offset) => from + offset)
  if (active >= 0 && active < times.length && (active < from || active > to)) indexes.push(active)
  return (
    <div
      ref={setRefs}
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={times[active] ? `${id}-${active}` : undefined}
      className={cx("fa-time-list", className)}
      data-scroll-container
      onKeyDown={onKeyDown}
      onScroll={onScroll}
    >
      <div className="fa-time-list-probe fa-item fa-time-option" ref={probeRef} aria-hidden>
        {format(times[0]!)}
      </div>
      <div role="presentation" className="fa-time-list-canvas" style={{ height: times.length * rowHeight }}>
        {indexes.map((index) => {
          const time = times[index]!
          const selected = time === value
          return (
            // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- the listbox handles the keyboard for its active descendant
            <div
              key={time}
              id={`${id}-${index}`}
              role="option"
              aria-selected={selected}
              aria-posinset={index + 1}
              aria-setsize={times.length}
              className="fa-item fa-time-option"
              data-selected={selected ? "" : undefined}
              data-highlighted={index === active ? "" : undefined}
              style={{ transform: `translateY(${index * rowHeight}px)` }}
              onPointerMove={() => index !== active && setActive(index)}
              onClick={() => onPick(time)}
            >
              <span className="fa-item-label">{format(time)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
