/**
 * Transient drag state for one workspace: which window is moving and where it would land.
 * Kept out of the window store (it is never persisted or synced) and out of React state
 * (only the snap bar and the preview subscribe), so a drag re-renders no window.
 */
import type { EdgeTarget } from "./geometry.js"

export interface DragSnapshot {
  id: string | null
  target: EdgeTarget | null
  /** Index of the snap bar layout under the pointer, when the target came from the bar. */
  layout: number | null
}

export interface DragStore {
  get(): DragSnapshot
  subscribe(listener: () => void): () => void
  start(id: string): void
  setTarget(target: EdgeTarget | null, layout?: number | null): void
  end(): void
}

const IDLE: DragSnapshot = { id: null, target: null, layout: null }

export function createDragStore(): DragStore {
  let snapshot = IDLE
  const listeners = new Set<() => void>()
  const set = (next: DragSnapshot) => {
    if (next.id === snapshot.id && next.target === snapshot.target && next.layout === snapshot.layout) return
    snapshot = next
    for (const listener of listeners) listener()
  }
  return {
    get: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    start: (id) => set({ id, target: null, layout: null }),
    setTarget: (target, layout = null) => set({ ...snapshot, target, layout: target ? layout : null }),
    end: () => set(IDLE),
  }
}

/** The pointer distance before a press on an app bar becomes a drag. */
export const DRAG_THRESHOLD = 4
/** How close to a workspace edge (CSS px) the pointer must be to snap. */
export const EDGE_SNAP = 18

/** Find the snap bar zone under the pointer. Zones carry data-snap-zone and data-snap-layout. */
export function snapBarHit(root: ParentNode, clientX: number, clientY: number) {
  for (const element of root.querySelectorAll<HTMLElement>("[data-snap-zone]")) {
    const box = element.getBoundingClientRect()
    if (clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom) {
      return { zone: element.dataset.snapZone as EdgeTarget, layout: Number(element.dataset.snapLayout ?? 0) }
    }
  }
  return null
}
