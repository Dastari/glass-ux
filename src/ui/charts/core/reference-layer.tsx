/**
 * Draws a chart's references on a vertical value axis (reference.ts has the geometry): bands
 * and threshold lines in the plot's SVG, under the marks; event markers as rules with a dot
 * at the top; and their labels as HTML in the label layer, so they take the caption role and
 * truncate with a real ellipsis.
 */
import { useMemo } from "react"
import { useLocale } from "../../../lib/locale/use-locale.js"
import { useMessages } from "../../../lib/i18n/use-messages.js"
import { captionLinePx, ChartText, textWidth } from "./axes.js"
import { formatValue, type LocalizedFormat } from "./format.js"
import { bandKey, markerKey, placeLineLabels, placeMarkerLabels, thresholdKey, type Marker, type ReferenceBand, type Threshold } from "./reference.js"
import { seriesAttrs } from "./series.js"
import { chartViewMessages, joinList } from "./view-messages.js"

const crisp = (value: number) => Math.round(value) + 0.5

export interface ReferenceGeometry {
  /** Value → plot y, px. */
  py: (value: number) => number
  x0: number
  x1: number
  y0: number
  y1: number
  /** Current pixel size of one rem used for layout measurement. */
  rem: number
}

/** A marker placed on the x axis: its rule's px, or null when it is outside the visible window. */
export interface PlacedMarker {
  marker: Marker
  key: string
  x: number | null
}

/** Bands and threshold lines (SVG, before the series so the marks draw over them). */
export function ReferenceMarks({ geometry, thresholds, bands, shade = true }: { geometry: ReferenceGeometry; thresholds: readonly Threshold[]; bands: readonly ReferenceBand[]; shade?: boolean }) {
  const { py, x0, x1 } = geometry
  return (
    <g className="fa-chart-references" aria-hidden>
      {shade
        ? bands.map((band, index) => {
            const top = py(Math.max(band.from, band.to))
            const bottom = py(Math.min(band.from, band.to))
            return <rect key={bandKey(band, index)} className="fa-chart-band" data-tone={band.tone ?? "neutral"} x={x0} width={Math.max(0, x1 - x0)} y={top} height={Math.max(0, bottom - top)} />
          })
        : null}
      {thresholds.map((threshold, index) => {
        const y = crisp(py(threshold.value))
        return <line key={thresholdKey(threshold, index)} className="fa-chart-threshold" data-tone={threshold.tone ?? "neutral"} data-dashed={threshold.dashed ? "" : undefined} x1={x0} x2={x1} y1={y} y2={y} />
      })}
    </g>
  )
}

/** Event rules with a dot at the plot's top (SVG). */
export function MarkerMarks({ markers, y0, y1, rem }: { markers: readonly PlacedMarker[]; y0: number; y1: number; rem: number }) {
  return (
    <>
      {markers.map(({ marker, key, x }) => {
        if (x === null) return null
        const mx = crisp(x)
        return (
          <g key={key} className="fa-chart-marker" {...(marker.tone ? seriesAttrs(undefined, marker.tone) : {})} aria-hidden>
            <line className="fa-chart-marker-rule" x1={mx} x2={mx} y1={y0} y2={y1} />
            <circle className="fa-chart-marker-dot" cx={mx} cy={y0} r={0.25 * rem} />
          </g>
        )
      })}
    </>
  )
}

/**
 * The labels: thresholds at the line's end (clear of each other, the plot's edges and the
 * `avoid` points), bands at their start, markers beside their rules along the top.
 */
export function ReferenceLabels({
  geometry,
  thresholds,
  bands,
  markers = [],
  fmt,
  avoid,
}: {
  geometry: ReferenceGeometry
  thresholds: readonly Threshold[]
  /** Bands with labels to show (pass only the caller's own bands). */
  bands: readonly ReferenceBand[]
  markers?: readonly PlacedMarker[]
  fmt: LocalizedFormat
  /** y positions near the plot's end the threshold labels keep clear of: the latest points. */
  avoid?: readonly number[]
}) {
  const { py, x0, x1, y0, y1, rem } = geometry
  const lineHeight = captionLinePx(rem)
  const inset = 0.375 * rem
  const shownMarkers = markers.filter((item) => item.x !== null)
  const labelled = useMemo(() => thresholds.map((threshold, index) => ({ threshold, key: thresholdKey(threshold, index) })).filter((item) => item.threshold.label), [thresholds])
  const placements = useMemo(
    () =>
      placeLineLabels(
        labelled.map(({ key, threshold }) => ({ key, y: crisp(py(threshold.value)) })),
        { top: y0 + (shownMarkers.length ? lineHeight / 2 : 0), bottom: y1, lineHeight, gap: 0.1875 * rem, avoid, avoidRadius: 0.5 * rem }
      ),
    [labelled, py, y0, y1, lineHeight, rem, avoid, shownMarkers.length]
  )
  const markerPlacements = useMemo(
    () => placeMarkerLabels(shownMarkers.map(({ key, x, marker }) => ({ key, x: crisp(x!), width: textWidth(marker.label, rem) })), x0, x1, 0.5 * rem),
    [shownMarkers, x0, x1, rem]
  )
  const byKey = new Map(labelled.map((item) => [item.key, item.threshold]))
  return (
    <>
      {bands.map((band, index) => {
        if (!band.label) return null
        const top = py(Math.max(band.from, band.to))
        const bottom = py(Math.min(band.from, band.to))
        if (bottom - top < lineHeight + 0.25 * rem) return null
        return (
          <ChartText key={bandKey(band, index)} className="fa-chart-band-label" data-tone={band.tone ?? "neutral"} x={x0 + inset} y={top + 0.125 * rem} baseline="top" width={Math.max(0, (x1 - x0) / 2 - inset)}>
            {band.label}
          </ChartText>
        )
      })}
      {placements.map((place) => {
        const threshold = byKey.get(place.key)!
        return (
          <ChartText key={place.key} className="fa-chart-threshold-label" data-tone={threshold.tone ?? "neutral"} data-side={place.side} x={x1 - inset} y={place.top} anchor="end" baseline="top" width={Math.max(0, x1 - x0 - 2 * inset)}>
            {threshold.label} · {formatValue(threshold.value, fmt)}
          </ChartText>
        )
      })}
      {markerPlacements.map((place) => {
        const marker = shownMarkers.find((item) => item.key === place.key)!.marker
        return (
          <ChartText key={place.key} className="fa-chart-marker-label" x={place.x} y={y0} anchor={place.anchor} width={place.width}>
            {marker.label}
          </ChartText>
        )
      })}
    </>
  )
}

/** Place markers on an x scale; outside [x0, x1] (a zoomed window) they are null. */
export function placeMarkers(markers: readonly Marker[] | undefined, px: (value: number) => number, x0: number, x1: number): PlacedMarker[] {
  return (markers ?? []).map((marker, index) => {
    const x = px(typeof marker.x === "number" ? marker.x : marker.x.getTime())
    return { marker, key: markerKey(marker, index), x: x < x0 - 0.5 || x > x1 + 0.5 ? null : x }
  })
}

/**
 * The references as sentences for the chart's accessible description and its table note:
 * "Reference lines: Warning at 80% and Critical at 95%." Bands derived from thresholds are
 * not repeated; only the caller's own `bands` are listed.
 */
export function useReferenceNotes({
  thresholds,
  bands,
  markers,
  fmt,
  xText,
}: {
  thresholds?: readonly Threshold[]
  bands?: readonly ReferenceBand[]
  markers?: readonly Marker[]
  fmt: LocalizedFormat
  /** An x value as the chart writes it. */
  xText?: (x: Marker["x"]) => string
}): string[] {
  const locale = useLocale(fmt.locale)
  const t = useMessages(chartViewMessages, { locale })
  return useMemo(() => {
    const notes: string[] = []
    if (thresholds?.length) notes.push(t.thresholds(joinList(thresholds.toSorted((a, b) => a.value - b.value).map((item) => t.threshold(item.label ?? "", formatValue(item.value, fmt))), locale)))
    if (bands?.length) notes.push(t.bands(joinList(bands.map((item) => t.band({ label: item.label ?? "", from: formatValue(Math.min(item.from, item.to), fmt), to: formatValue(Math.max(item.from, item.to), fmt) })), locale)))
    if (markers?.length && xText) notes.push(t.markers(joinList(markers.map((item) => t.marker(item.detail ? `${item.label} (${item.detail})` : item.label, xText(item.x))), locale)))
    return notes
  }, [thresholds, bands, markers, fmt, xText, t, locale])
}
