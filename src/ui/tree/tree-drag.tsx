/**
 * Dragging rows, loaded only for a Tree with `onMove`. Rows are virtualised and a drop has a
 * before, inside or after, which a sortable zone cannot express: the zone here is the whole
 * scroller, every row a Draggable while it is on screen, and the place comes from the
 * virtualiser's arithmetic, written to the drop line with no render per frame (R18.5).
 */
import { useEffect, useRef, type ReactElement, type ReactNode, type Ref, type RefObject } from "react"
import { useMediaQuery } from "../../lib/use-media-query.js"
import { CountBadge } from "../badge/index.js"
import { DragDropProvider, useDragDropMonitor, useDraggable, useDropZone } from "../drag-drop/index.js"
import { useHasDragDropProvider } from "../drag-drop/drag-drop.js"
import type { DragMoveEvent } from "../drag-drop/index.js"
import type { TreeMove } from "./flatten.js"
import type { TreeDragData } from "./tree.js"

const TOUCH_ONLY = "(hover: none) and (pointer: coarse)"

/** Where a drop would land, from the pointer's height. */
export interface TreeDropPlan {
  move: TreeMove
  place: "before" | "inside" | "after"
  rowId: string
  /** The drop line's offset in the canvas. */
  top: number
  level: number
  refused: boolean
  /** A closed branch to open if the pointer stays. */
  openable: string | null
}

export interface TreeDragRowProps {
  id: string
  label: string
  ids: (id: string) => string[]
  render: (ref: Ref<HTMLElement>) => ReactElement
}

/** The component that makes a row draggable. */
export type TreeDragRow = (props: TreeDragRowProps) => ReactElement

export interface TreeDragProps {
  scroller: RefObject<HTMLElement | null>
  label: string
  type: string
  plan: (clientY: number, ids: string[]) => TreeDropPlan | null
  open: (id: string) => void
  commit: (move: TreeMove) => boolean
  keepIds: RefObject<Set<string>>
  springMs: number
  /** Where the drag's live region goes: outside the tree, which may hold only rows. */
  liveHost: HTMLElement | null
  children: (row: TreeDragRow | null, dropLine: ReactNode) => ReactNode
}

function Scope({ scroller, label, type, plan, open, commit, keepIds, springMs, children }: TreeDragProps) {
  const zoneId = useRef(`tree-${label}`).current
  const line = useRef<HTMLDivElement>(null)
  const current = useRef<TreeDropPlan | null>(null)
  const marked = useRef<HTMLElement | null>(null)
  const spring = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null)
  const latest = useRef({ plan, open, type })
  latest.current = { plan, open, type }
  const clear = () => {
    current.current = null
    if (line.current) line.current.hidden = true
    marked.current?.removeAttribute("data-drop-inside")
    marked.current = null
    if (spring.current) clearTimeout(spring.current.timer)
    spring.current = null
  }
  const zone = useDropZone<TreeDragData>(
    {
      id: zoneId,
      label,
      accept: type,
      onDrop: () => {
        const planned = current.current
        clear()
        return planned && !planned.refused ? commit(planned.move) : false
      },
    },
    { trackState: false }
  )
  useEffect(() => zone.ref(scroller.current), [zone, scroller])
  useDragDropMonitor({
    onDragStart: (event) => {
      if (event.item.type === type) keepIds.current.add(event.item.id)
    },
    onDragMove: (event: DragMoveEvent) => {
      if (event.item.type !== type || !event.pointer || event.target.zoneId !== zoneId) return clear()
      const next = latest.current.plan(event.pointer.y, (event.item.data as TreeDragData).ids)
      if (!next) return clear()
      current.current = next
      const inside = next.place === "inside"
      const element = line.current
      if (element) {
        element.hidden = inside
        element.style.transform = `translateY(${next.top}px)`
        element.style.setProperty("--_level", String(next.level))
        element.toggleAttribute("data-refused", next.refused)
      }
      const row = inside ? (scroller.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(next.rowId)}"]`) ?? null) : null
      if (row !== marked.current) {
        marked.current?.removeAttribute("data-drop-inside")
        row?.toggleAttribute("data-drop-inside", true)
        marked.current = row
      }
      if (spring.current?.id === next.openable) return
      if (spring.current) clearTimeout(spring.current.timer)
      spring.current = null
      if (next.openable) {
        const id = next.openable
        spring.current = { id, timer: setTimeout(() => latest.current.open(id), springMs) }
      }
    },
    onDragEnd: (event) => {
      keepIds.current.delete(event.item.id)
      clear()
    },
  })
  const row = useRef<TreeDragRow>(function DraggableRow({ id, label: name, ids, render }) {
    const touchOnly = useMediaQuery(TOUCH_ONLY)
    const moving = ids(id)
    const draggable = useDraggable<TreeDragData>({
      id,
      type: latest.current.type,
      data: { ids: moving },
      label: name,
      disabled: touchOnly,
      // Enter and Space belong to the row: its keyboard route is Alt and the arrow keys.
      liftKeys: [],
      grip: false,
      preview:
        moving.length > 1 ? (
          <span className="fa-tree-drag-preview glass-overlay">
            {name}
            <CountBadge value={moving.length} />
          </span>
        ) : undefined,
    })
    return render((element) => {
      draggable.ref(element)
      draggable.handleRef(element)
    })
  }).current
  // Rows stay out of the zone's scope: a zone that holds its own item and does not sort
  // would read every drop as going back where it came from.
  return children(row, <div ref={line} className="fa-tree-drop-line" hidden />)
}

/** Rows join a DragDropProvider above the tree; with none, the tree brings its own. */
export default function TreeDrag(props: TreeDragProps) {
  const shared = useHasDragDropProvider()
  const body = <Scope {...props} />
  return shared ? body : <DragDropProvider liveRegionHost={props.liveHost}>{body}</DragDropProvider>
}
