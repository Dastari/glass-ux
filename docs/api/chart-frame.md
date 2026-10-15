# ChartFrame

The shell every chart renders in. It is a size container (R7.3) that fills its parent; the
box picks the tier on both axes (see tier.ts). It owns the head row (title, legend or
readout, the table toggle), the in-place loading, empty and error states (R9.1), and the
table fallback. The parent must give it a definite height.

`import { ChartFrame } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/chart-frame)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `(box: PlotBox) => ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| compactHead | `boolean \| undefined` | false, true | no | false | Whether the head row exists in the compact tier (it always does in full). Fixed per chart type so the skeleton and the loaded chart share one geometry. |
| emptyText | `ReactNode` | See type | no | "No data" | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | "Couldn’t load this chart" | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| head | `((tier: ChartTier) => ReactNode) \| undefined` | See type | no | — | Legend or readout for the head row (compact and full tiers). |
| kind | `ChartKind` | "line", "column", "bar", "pie", "gauge", "heatmap", "scatter", "treemap", "sunburst" | yes | — | Semantic entity or content kind, used to choose labels and rendering. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called when retry occurs. The callback type specifies its arguments. |
| rule | `TierRule \| undefined` | See type | no | DEFAULT_TIERS | The typed disclosure or validation rule applied to this value. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| table | `ChartTableModel \| undefined` | See type | no | — | The data as a table: visually hidden for screen readers, or shown with "View as table". |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| trail | `ReactNode` | See type | no | — | Content after the plot in the micro tier (the latest value, a share). |
| trailOptional | `boolean \| undefined` | false, true | no | false | The trail is a nicety: it hides in narrow rows so the marks keep their room. |
| trailSize | `"figure" \| "value" \| undefined` | "figure", "value" | no | "figure" | The trail's reserved width, so loading and loaded share one geometry: a bare `value` ("44.4%") or a `figure` (label and value, about a third of the row). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
