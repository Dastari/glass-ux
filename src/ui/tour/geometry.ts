/** The spotlight's shape, kept pure: the viewport with a rounded hole around the target. */

/** A rectangle in viewport pixels. */
export interface SpotRect {
  x: number
  y: number
  width: number
  height: number
}

const n = (value: number) => Math.round(value * 100) / 100

/**
 * An even-odd path for `clip-path: path(evenodd, …)`: the viewport, minus a rounded hole
 * around `target` grown by `padding`. With no target the hole is a point at the centre, so
 * every path has the same commands and the hole can animate between steps.
 */
export function spotlightPath(viewport: { width: number; height: number }, target: SpotRect | null, padding: number, radius: number): string {
  const hole = target
    ? {
        x: Math.max(0, target.x - padding),
        y: Math.max(0, target.y - padding),
        right: Math.min(viewport.width, target.x + target.width + padding),
        bottom: Math.min(viewport.height, target.y + target.height + padding),
      }
    : { x: viewport.width / 2, y: viewport.height / 2, right: viewport.width / 2, bottom: viewport.height / 2 }
  const w = Math.max(0, hole.right - hole.x)
  const h = Math.max(0, hole.bottom - hole.y)
  const r = Math.max(0, Math.min(radius, w / 2, h / 2))
  const { x, y } = hole
  return [
    `M0 0H${n(viewport.width)}V${n(viewport.height)}H0Z`,
    `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`,
  ].join("")
}

/** Whether a rectangle lies wholly inside the viewport (else the target scrolls into view). */
export function fullyVisible(rect: SpotRect, viewport: { width: number; height: number }): boolean {
  return rect.y >= 0 && rect.x >= 0 && rect.y + rect.height <= viewport.height && rect.x + rect.width <= viewport.width
}

/**
 * The next step to show from `from` in `direction`, skipping steps reported missing, or -1
 * when none is left that way.
 */
export function nextStep(count: number, from: number, direction: 1 | -1, missing: ReadonlySet<number>): number {
  for (let at = from + direction; at >= 0 && at < count; at += direction) if (!missing.has(at)) return at
  return -1
}
