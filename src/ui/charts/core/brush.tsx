/**
 * The overview brush: a compact strip of the whole series with a window over the part a
 * chart shows. Drag the window to pan, drag its handles to resize, drag across the strip to
 * draw a new window; a click outside the window centres it there. The handles and the
 * window are sliders (one tab stop each): arrows step one sample, Page keys a tenth of the
 * samples (the window: its own width), Home and End go to the ends.
 *
 * While a pointer drags, the window is styled directly and reported through `onPreview`;
 * the change is committed once, on release (R18.5).
 */
import { useEffect, useMemo, useRef, type ComponentProps, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { cx } from "../../../lib/cx.js"
import { useMessages } from "../../../lib/i18n/use-messages.js"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { useElementSize } from "../../../lib/use-element-size.js"
import { lttbIndices } from "./decimate.js"
import { formatInstant, formatTick } from "./format.js"
import { areaPath, linePath, segments } from "./geometry.js"
import type { Store } from "./hover.js"
import { isTime, linear, nearestIndex, toNumber, valueDomain, type Domain, type XValue } from "./scales.js"
import { seriesAttrs, slotFor, type ChartTone } from "./series.js"
import { chartViewMessages } from "./view-messages.js"
import { remPx } from "./tier.js"
import { clampWindow, isFullWindow, useXWindow, type XDomain, type XWindow } from "./zoom.js"

/** A series drawn in the overview. */
export interface BrushSeries {
  key: string
  /** One value per x; null is a gap. */
  data: readonly (number | null)[]
  /** Categorical slot 1–8; defaults to the series' position. */
  slot?: number
  /** Status tone, only when the whole series means that state. */
  tone?: ChartTone
}

export interface ChartBrushProps extends Omit<ComponentProps<"div">, "children" | "onChange" | "defaultValue"> {
  /** The x values of the whole range, ascending: Dates for time, numbers otherwise. */
  x: readonly XValue[]
  /** The series drawn in the strip; the first gets the wash when it is the only one. */
  series: readonly BrushSeries[]
  /** Controlled window: null shows the whole range. Leave undefined for uncontrolled. */
  value?: XDomain | null
  /** The uncontrolled starting window. */
  defaultValue?: XDomain | null
  /** Called once per change (on release, or per key), with null for the whole range. */
  onValueChange?: (domain: XDomain | null) => void
  /** Accessible name of the strip: "CPU · NST-C106 · overview". */
  label: string
  /** Fixed value range for the strip's line. Defaults to the data's. */
  domain?: Domain
  /** Format a numeric x for the handles' values. */
  formatX?: (x: number) => string
  /** BCP 47 locale for the handles' values. Default: the nearest LocaleProvider. */
  locale?: string
}

/**
 * An overview strip with a draggable, resizable window that drives a chart's x domain:
 * pass the same `value` to the charts' `xDomain` to show one range in several charts.
 * LineChart and AreaChart draw one under the plot with `brush`.
 */
export function ChartBrush({ x, series, value, defaultValue, onValueChange, label, domain, formatX, locale: localeProp, className, ...rest }: ChartBrushProps) {
  const xs = useMemo(() => x.map(toNumber), [x])
  const time = isTime(x)
  const state = useXWindow({ xs, time, value, defaultValue, onChange: onValueChange })
  const locale = useLocale(localeProp)
  const xText = (at: number) => (time ? formatInstant(new Date(at), xs.length > 1 ? xs[xs.length - 1]! - xs[0]! : 0, locale) : formatX ? formatX(at) : formatTick(at, 1, { locale }))
  return (
    <BrushStrip
      {...rest}
      className={className}
      xs={xs}
      series={series}
      domain={domain}
      window={state.window}
      full={state.full}
      min={state.min}
      onCommit={state.commit}
      label={label}
      xText={xText}
      locale={locale}
    />
  )
}

export interface BrushStripProps extends Omit<ComponentProps<"div">, "children"> {
  xs: readonly number[]
  series: readonly BrushSeries[]
  domain?: Domain
  window: XWindow
  full: XWindow
  min: number
  onCommit: (window: XWindow | null) => void
  /** Called while a pointer drags, and with null when it lets go. */
  onPreview?: (window: XWindow | null) => void
  /** Another view's preview (the plot's wheel zoom), mirrored in the strip while it runs. */
  preview?: Store<XWindow | null>
  label: string
  /** An x value as text, for the sliders. */
  xText: (x: number) => string
  locale?: string
}

/** The strip itself, in x units: ChartBrush's state, or LineChart's. */
export function BrushStrip({ xs, series, domain, window: view, full, min, onCommit, onPreview, preview, label, xText, locale, className, ...rest }: BrushStripProps) {
  const t = useMessages(chartViewMessages, { locale })
  const ref = useRef<HTMLDivElement>(null)
  const size = useElementSize(ref)
  const { width, height } = size
  // Inset by half a handle, so a window at either end keeps its handle inside the strip.
  const pad = remPx() * 0.375
  const scale = useMemo(() => linear(full, [pad, Math.max(pad + 1, width - pad)]), [full, pad, width])
  const toX = (px: number) => full[0] + ((px - pad) / Math.max(1, width - 2 * pad)) * (full[1] - full[0])

  const paths = useMemo(() => {
    if (width < 2 || height < 2 || xs.length < 2) return []
    const yDomain = valueDomain(
      series.flatMap((item) => item.data),
      domain,
      { zero: series.length === 1 }
    )
    const inset = 0.125 * remPx() + 1
    const py = linear(yDomain, [height - inset, inset])
    const budget = Math.max(32, Math.round(width))
    return series.map((item, index) => {
      const points = item.data.map((v, i) => ({ x: scale(xs[i]!), y: v === null || v === undefined ? null : py(v), index: i }))
      const lines: string[] = []
      const areas: string[] = []
      for (const run of segments(points)) {
        let kept = run
        if (run.length > budget) kept = lttbIndices(run.map((p) => p.x), run.map((p) => p.y), budget).map((k) => run[k]!)
        const pts = kept.map((p) => ({ x: p.x, y: p.y as number }))
        lines.push(linePath(pts))
        if (series.length === 1) areas.push(areaPath(pts, py(Math.max(yDomain[0], Math.min(yDomain[1], 0)))))
      }
      return { key: item.key, slot: slotFor(index, item.slot), tone: item.tone, lines, areas }
    })
  }, [series, xs, domain, width, height, scale])

  // The window's place, written as two custom properties so a drag restyles nothing else.
  const place = (window: XWindow) => {
    const element = ref.current
    if (!element) return
    element.style.setProperty("--_from", `${scale(window[0])}px`)
    element.style.setProperty("--_to", `${scale(window[1])}px`)
  }
  useEffect(() => place(view))
  useEffect(() => {
    if (!preview) return
    return preview.subscribe(() => place(preview.get() ?? view))
  })

  // ── Pointer ─────────────────────────────────────────────────────────────────────────
  const drag = useRef<{ id: number; mode: "start" | "end" | "pan" | "new"; anchor: number; origin: XWindow; moved: boolean; window: XWindow } | null>(null)
  const local = (event: { clientX: number }) => event.clientX - (ref.current?.getBoundingClientRect().left ?? 0)
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    const edge = target.closest<HTMLElement>("[data-edge]")?.dataset.edge as "start" | "end" | undefined
    const onWindow = Boolean(target.closest(".fa-chart-brush-window"))
    const at = toX(local(event))
    drag.current = { id: event.pointerId, mode: edge ?? (onWindow ? "pan" : "new"), anchor: at, origin: view, moved: false, window: view }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.currentTarget.toggleAttribute("data-dragging", true)
    if (edge || onWindow) (target.closest<HTMLElement>("[data-edge], .fa-chart-brush-window") ?? target).focus({ preventScroll: true })
    event.preventDefault()
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || event.pointerId !== current.id) return
    const at = Math.min(full[1], Math.max(full[0], toX(local(event))))
    if (!current.moved && Math.abs(scale(at) - scale(current.anchor)) < 3) return
    current.moved = true
    let next: XWindow
    if (current.mode === "pan") next = clampWindow([current.origin[0] + at - current.anchor, current.origin[1] + at - current.anchor], full, min)
    else if (current.mode === "start") next = [Math.min(at, current.origin[1] - min), current.origin[1]]
    else if (current.mode === "end") next = [current.origin[0], Math.max(at, current.origin[0] + min)]
    else next = clampWindow([Math.min(current.anchor, at), Math.max(current.anchor, at)], full, min)
    next = [Math.max(full[0], next[0]), Math.min(full[1], next[1])]
    current.window = next
    place(next)
    onPreview?.(next)
  }
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || event.pointerId !== current.id) return
    drag.current = null
    event.currentTarget.removeAttribute("data-dragging")
    onPreview?.(null)
    if (event.type === "pointercancel") return place(view)
    if (current.moved) return onCommit(current.window)
    // A click outside the window centres it there.
    if (current.mode === "new") {
      const span = view[1] - view[0]
      onCommit(clampWindow([current.anchor - span / 2, current.anchor + span / 2], full, min))
    }
  }

  // ── Keyboard ────────────────────────────────────────────────────────────────────────
  const n = xs.length
  const startIndex = nearestIndex(xs, view[0])
  const endIndex = nearestIndex(xs, view[1])
  const page = Math.max(1, Math.round(n / 10))
  const step = (key: string, index: number, low: number, high: number, jump: number) => {
    switch (key) {
      case "ArrowRight":
      case "ArrowUp":
        return Math.min(high, index + 1)
      case "ArrowLeft":
      case "ArrowDown":
        return Math.max(low, index - 1)
      case "PageUp":
        return Math.min(high, index + jump)
      case "PageDown":
        return Math.max(low, index - jump)
      case "Home":
        return low
      case "End":
        return high
      default:
        return null
    }
  }
  const samples = Math.max(1, Math.round(min / Math.max(1e-9, (full[1] - full[0]) / Math.max(1, n - 1))))
  const onEdgeKey = (edge: "start" | "end") => (event: KeyboardEvent<HTMLDivElement>) => {
    const next = edge === "start" ? step(event.key, startIndex, 0, Math.max(0, endIndex - samples), page) : step(event.key, endIndex, Math.min(n - 1, startIndex + samples), n - 1, page)
    if (next === null) return
    event.preventDefault()
    onCommit(edge === "start" ? [xs[next]!, view[1]] : [view[0], xs[next]!])
  }
  const onWindowKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const width = endIndex - startIndex
    const next = step(event.key, startIndex, 0, Math.max(0, n - 1 - width), Math.max(1, width))
    if (next === null) return
    event.preventDefault()
    const delta = xs[next]! - xs[startIndex]!
    onCommit(clampWindow([view[0] + delta, view[1] + delta], full, min))
  }
  const full_ = isFullWindow(view, full)

  return (
    <div
      {...rest}
      ref={ref}
      role="group"
      aria-label={`${label} · ${t.brush}`}
      className={cx("fa-chart-brush glass-inset", className)}
      data-full={full_ ? "" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg className="fa-chart-brush-svg" width={width} height={height} aria-hidden>
        {paths.map((item) => (
          <g key={item.key} {...seriesAttrs(item.slot, item.tone)}>
            {item.areas.map((d, index) => (
              <path key={`a${index}`} className="fa-chart-brush-area" d={d} />
            ))}
            {item.lines.map((d, index) => (
              <path key={`l${index}`} className="fa-chart-brush-line" d={d} />
            ))}
          </g>
        ))}
      </svg>
      <span className="fa-chart-brush-shade" data-side="start" aria-hidden />
      <span className="fa-chart-brush-shade" data-side="end" aria-hidden />
      <div
        className="fa-chart-brush-window"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, n - 1 - (endIndex - startIndex))}
        aria-valuenow={startIndex}
        aria-valuetext={t.showing(xText(view[0]), xText(view[1]))}
        onKeyDown={onWindowKey}
      />
      <div
          className="fa-chart-brush-handle"
          data-edge="start"
          role="slider"
          tabIndex={0}
          aria-label={t.brushStart}
          aria-valuemin={0}
          aria-valuemax={Math.max(0, endIndex - samples)}
          aria-valuenow={startIndex}
          aria-valuetext={xText(view[0])}
          onKeyDown={onEdgeKey("start")}
        />
        <div
          className="fa-chart-brush-handle"
          data-edge="end"
          role="slider"
          tabIndex={0}
          aria-label={t.brushEnd}
          aria-valuemin={Math.min(n - 1, startIndex + samples)}
          aria-valuemax={Math.max(0, n - 1)}
          aria-valuenow={endIndex}
          aria-valuetext={xText(view[1])}
          onKeyDown={onEdgeKey("end")}
        />
    </div>
  )
}
