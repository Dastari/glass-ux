/**
 * Charts — one visual language with Sparkline and Metric. Every chart fills its box
 * (container-type: size), picks micro / compact / full from that box on both axes, themes
 * from the data roles (--chart-1 … --chart-8 derive from the palette's --chart-h, never the
 * accent: src/styles/data.css), and carries its data as a table for assistive tech,
 * "View as table" and "Copy as CSV".
 */
export { ChartFrame, PlotSkeleton, type ChartCommonProps, type ChartFrameProps, type ChartKind, type ChartState, type PlotBox } from "./core/frame.js"
export { ChartLegend, Swatch, type ChartLegendProps, type LegendItem, type SwatchShape } from "./core/legend.js"
export { ChartTooltip, TooltipBody, type ChartTooltipProps, type TooltipRow } from "./core/tooltip.js"
export { ChartTable, chartTableToCsv, type ChartTableColumn, type ChartTableCsvOptions, type ChartTableModel, type ChartTableValue } from "./core/table.js"
export { HitLayer, type HitLayerProps } from "./core/hit.js"
export { createStore, useHoverStore, useStoreValue, type Hover, type HoverStore, type Store } from "./core/hover.js"
export { chartTier, DEFAULT_TIERS, type ChartTier, type TierRule } from "./core/tier.js"
export { seriesAttrs, slotFor, SLOT_COUNT, type ChartTone } from "./core/series.js"
export {
  BYTES,
  formatBytes,
  formatClock,
  formatCompact,
  formatDate,
  formatInstant,
  formatRelative,
  formatShare,
  formatTick,
  formatTimeTicks,
  formatValue,
  type LocalizedFormat,
  type ValueFormat,
} from "./core/format.js"
export { linearTicks, timeTicks, valueDomain, type Domain, type XValue } from "./core/scales.js"
export { lttbIndices, DECIMATE_ABOVE } from "./core/decimate.js"
export { AreaChart, LineChart, type LineChartProps, type LineSeries, type Marker, type Threshold } from "./line/line-chart.js"
export { BarChart, ColumnChart, type BarChartProps, type BarSeries } from "./bar/bar-chart.js"
export { DonutChart, PieChart, type PieChartProps, type PieSlice } from "./pie/pie-chart.js"
export { Gauge, RadialBar, type GaugeProps, type RadialBarItem, type RadialBarProps } from "./gauge/gauge.js"
export { Heatmap, type HeatmapProps } from "./heatmap/heatmap.js"
export { Histogram, ScatterChart, type HistogramProps, type ScatterAxis, type ScatterChartProps, type ScatterPoint, type ScatterSeries } from "./scatter/scatter.js"
export { spatialNav, Treemap, type TreemapProps } from "./treemap/treemap.js"
export { Sunburst, type SunburstProps } from "./sunburst/sunburst.js"
export { DrillPathBar, useDrill, useHierarchy, type ColourBy, type HierarchyDatum } from "./core/drill.js"
export { ProportionStrip, type StripItem } from "./core/strip.js"
