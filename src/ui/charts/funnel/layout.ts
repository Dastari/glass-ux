/** A funnel's maths in pixel space: bar widths, connectors between bars and stage-to-stage rates. */

export interface FunnelRates {
  /** The stage as a fraction of the first; null without a first stage to compare with. */
  ofFirst: number | null
  /** The stage as a fraction of the one before; null for the first stage. */
  ofPrevious: number | null
  /** How much was lost since the stage before (negative when the stage grew); null for the first stage. */
  drop: number | null
}

/** Conversion rates for stages in order. A zero stage has no rate to the one after it. */
export function funnelRates(values: readonly number[]): FunnelRates[] {
  const first = Math.max(0, values[0] ?? 0)
  return values.map((value, index) => {
    const previous = index > 0 ? Math.max(0, values[index - 1] ?? 0) : null
    const here = Math.max(0, value)
    return {
      ofFirst: first > 0 ? here / first : null,
      ofPrevious: previous === null || previous === 0 ? null : here / previous,
      drop: previous === null ? null : previous - here,
    }
  })
}

export interface FunnelBar {
  /** Horizontal coordinate or accessor. */
  x: number
  /** Vertical coordinate or accessor. */
  y: number
  /** Available width or named width tier. */
  width: number
  /** Available height used for the component’s size tier. */
  height: number
}

export interface FunnelBarOptions {
  /** The bars' track, in px. */
  x0: number
  x1: number
  /** The first row's top, in px. */
  top: number
  /** One row's height, in px. */
  pitch: number
  /** A bar's thickness, in px. */
  thick: number
  /** The bar's offset inside its row, in px. */
  offset: number
  /** `centre` draws the funnel's shape; `start` lines the bars up at one edge, for exact comparison. */
  align: "centre" | "start"
  /** A stage with a value keeps at least this width, in px. */
  minWidth?: number
}

/** One bar per stage: widths share a scale with the largest stage, so a stage that grew reads as growth. */
export function funnelBars(values: readonly number[], { x0, x1, top, pitch, thick, offset, align, minWidth = 2 }: FunnelBarOptions): FunnelBar[] {
  const track = Math.max(0, x1 - x0)
  const max = Math.max(0, ...values)
  return values.map((value, index) => {
    const width = max > 0 ? Math.max(value > 0 ? minWidth : 0, (Math.max(0, value) / max) * track) : 0
    return { x: align === "centre" ? x0 + (track - width) / 2 : x0, y: top + index * pitch + offset, width, height: thick }
  })
}

/** The band from one bar's lower edge to the next bar's upper edge: the people lost between them. */
export function funnelConnector(from: FunnelBar, to: FunnelBar): string {
  const y0 = from.y + from.height
  const y1 = to.y
  if (y1 <= y0) return ""
  const r = (value: number) => Math.round(value * 100) / 100
  return `M${r(from.x)},${r(y0)}L${r(from.x + from.width)},${r(y0)}L${r(to.x + to.width)},${r(y1)}L${r(to.x)},${r(y1)}Z`
}
