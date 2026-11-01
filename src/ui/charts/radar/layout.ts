/** A radar's maths in pixel space: spoke angles, positions, outlines and where labels fit. */
import type { TextAnchor, TextBaseline } from "../core/axes.js"
import type { Point } from "../core/geometry.js"

const TURN = Math.PI * 2
const r = (value: number) => Math.round(value * 100) / 100

/** The angle of spoke `index`: the first points up and the rest follow clockwise, as a pie's slices do. */
export const spokeAngle = (index: number, count: number) => (TURN * index) / Math.max(1, count)

/** The point at `fraction` (0 centre, 1 rim) along a spoke. */
export function spokePoint(cx: number, cy: number, radius: number, index: number, count: number, fraction: number): Point {
  const angle = spokeAngle(index, count)
  return { x: cx + Math.sin(angle) * radius * fraction, y: cy - Math.cos(angle) * radius * fraction }
}

/** A closed outline through points, with straight sides: a radar's sides join values, they do not interpolate between them. */
export function closedPath(points: readonly Point[]): string {
  if (points.length === 0) return ""
  return `M${points.map((point) => `${r(point.x)},${r(point.y)}`).join("L")}Z`
}

/** An open outline through points. */
export function openPath(points: readonly Point[]): string {
  if (points.length === 0) return ""
  return `M${points.map((point) => `${r(point.x)},${r(point.y)}`).join("L")}`
}

export interface RadarOutline {
  /** The closed outline, or null when a value is missing: a shape cannot close across a gap. */
  closed: string | null
  /** One open path per run of readings around the ring, when a value is missing. */
  runs: string[]
  /** A reading alone between gaps, which no path can draw. */
  lone: Point[]
}

/** The outline of one series. Runs wrap past the last spoke to the first, so a gap breaks the ring in one place. */
export function radarOutline(points: readonly (Point | null)[]): RadarOutline {
  const count = points.length
  const firstGap = points.indexOf(null)
  if (firstGap < 0) return { closed: closedPath(points as Point[]), runs: [], lone: [] }
  const groups: Point[][] = []
  let run: Point[] = []
  for (let step = 1; step <= count; step++) {
    const point = points[(firstGap + step) % count]
    if (point) run.push(point)
    else if (run.length) {
      groups.push(run)
      run = []
    }
  }
  if (run.length) groups.push(run)
  return { closed: null, runs: groups.filter((group) => group.length > 1).map(openPath), lone: groups.filter((group) => group.length === 1).map((group) => group[0]!) }
}

export interface SpokeLabel {
  anchor: TextAnchor
  baseline: TextBaseline
}

/** How a label stands off its spoke's end: away from the ring, whatever the angle. */
export function spokeLabel(index: number, count: number): SpokeLabel {
  const angle = spokeAngle(index, count)
  const sin = Math.sin(angle)
  const cos = Math.cos(angle)
  return {
    anchor: Math.abs(sin) < 0.2 ? "middle" : sin > 0 ? "start" : "end",
    baseline: Math.abs(sin) < 0.2 ? (cos > 0 ? "bottom" : "top") : "middle",
  }
}

export interface RadarFitOptions {
  /** Available width or named width tier. */
  width: number
  /** Available height used for the component’s size tier. */
  height: number
  count: number
  /** The widest label's estimated width, in px; 0 for no labels. */
  labelWidth: number
  /** A label's line height, in px; 0 for no labels. */
  labelHeight: number
  /** px between a spoke's end and its label. */
  gap: number
  /** The rim's radius is kept at least this, in px; labels truncate before it shrinks further. */
  minRadius: number
  /** Space left clear around the ring, in px, for the dots at the rim. */
  pad: number
}

/** The ring's centre and radius in a box, and how wide a side label may be. */
export function radarFit({ width, height, count, labelWidth, labelHeight, gap, minRadius, pad }: RadarFitOptions) {
  const cx = width / 2
  const cy = height / 2
  // How far the outermost side spoke and the top and bottom spokes reach, as fractions of the radius.
  let side = 0
  let tall = 0
  for (let index = 0; index < count; index++) {
    const angle = spokeAngle(index, count)
    side = Math.max(side, Math.abs(Math.sin(angle)))
    tall = Math.max(tall, Math.abs(Math.cos(angle)))
  }
  const hasLabels = labelWidth > 0
  const roomX = (width / 2 - pad - (hasLabels ? labelWidth + gap : 0)) / Math.max(0.2, side)
  const roomY = (height / 2 - pad - (hasLabels ? labelHeight + gap : 0)) / Math.max(0.2, tall)
  const radius = Math.max(0, Math.min(roomY, Math.max(roomX, Math.min(minRadius, height / 2 - pad))))
  // The labels give up width once the ring has reached its minimum.
  const labelRoom = hasLabels ? Math.max(0, width / 2 - pad - gap - radius * side) : 0
  return { cx, cy, radius, labelWidth: Math.min(labelWidth, labelRoom) }
}

/** The spoke nearest to a point, by angle. */
export function nearestSpoke(dx: number, dy: number, count: number): number {
  let angle = Math.atan2(dx, -dy)
  if (angle < 0) angle += TURN
  return Math.round(angle / (TURN / Math.max(1, count))) % Math.max(1, count)
}
