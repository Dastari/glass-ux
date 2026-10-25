# ChartFrame

The shell every chart renders in. It is a size container (R7.3) that fills its parent; the
box picks the tier on both axes (see tier.ts). It owns the head row (title, legend or
readout, and in the full tier the "View as table" toggle and "Copy as CSV"), the in-place
loading, empty and error states (R9.1), and the table fallback. The tools are present,
disabled, while the chart loads, so the head does not move when the data arrives (R9).
The parent must give it a definite height.

`import { ChartFrame } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/chart-frame)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `(box: PlotBox) => ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| compactHead | `boolean \| undefined` | false, true | no | false | Whether the head row exists in the compact tier (it always does in full). Fixed per chart type so the skeleton and the loaded chart share one geometry. |
| emptyText | `ReactNode` | See type | no | "No data" | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | "Couldn’t load this chart" | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| foot | `ReactNode` | See type | no | — | A strip under the plot in the full tier (LineChart's overview brush). Its box is kept while the chart loads, as a skeleton, so loading moves nothing (R9.3). |
| head | `((tier: ChartTier) => ReactNode) \| undefined` | See type | no | — | Legend or readout for the head row (compact and full tiers). |
| kind | `ChartKind` | "line", "column", "bar", "pie", "gauge", "heatmap", "scatter", "treemap", "sunburst" | yes | — | Semantic entity or content kind, used to choose labels and rendering. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this chart's numbers, dates and table. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| note | `string \| undefined` | See type | no | — | A sentence that explains how the marks are drawn, added to the figure's accessible description. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| rule | `TierRule \| undefined` | See type | no | DEFAULT_TIERS | The typed disclosure or validation rule applied to this value. |
| state | `ChartState \| undefined` | "error", "loading", "ready", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| table | `ChartTableModel \| undefined` | See type | no | — | The data as a table: visually hidden for screen readers, shown with "View as table", and copied by "Copy as CSV" (raw `values` where the model has them). |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| tools | `ReactNode` | See type | no | — | Controls placed before "View as table" in the full tier's head (a chart's "Reset zoom"). They should hold their space whether or not they show, so the head never moves. |
| trail | `ReactNode` | See type | no | — | Content after the plot in the micro tier (the latest value, a share). |
| trailOptional | `boolean \| undefined` | false, true | no | false | The trail is a nicety: it hides in narrow rows so the marks keep their room. |
| trailSize | `"figure" \| "value" \| undefined` | "figure", "value" | no | "figure" | The trail's reserved width, so loading and loaded share one geometry: a bare `value` ("44.4%") or a `figure` (label and value, about a third of the row). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
