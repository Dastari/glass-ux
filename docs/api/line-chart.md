# LineChart

Lines and areas over time — one visual language with Sparkline: the same monotone curve,
2px stroke, gradient wash and ringed end dot, then axes, a legend and a crosshair as the
box grows.

  micro    the lines only (a multi-series sparkline) with the latest values as a trail
  compact  title, passive legend or latest value; the plot with its top gridline and the
           first and last x labels
  full     y gridlines and labels, x labels, threshold bands and markers, an interactive
           legend, and the crosshair: one series' readout replaces its value in the head
           (Metric's model); several series show the glass tooltip

`import { LineChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/line-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| area | `boolean \| undefined` | false, true | no | — | The Sparkline wash under each line. Defaults on for a single series. |
| domain | `Domain \| undefined` | See type | no | — | Fixed value range (percentages: [0, 100]). Defaults to the data, rounded to nice ticks. |
| emptyText | `ReactNode` | false, true | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | false, true | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). |
| formatX | `((x: number) => string) \| undefined` | See type | no | — | Format a numeric x. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| markers | `readonly Marker[] \| undefined` | See type | no | — | Events on the x axis. |
| now | `Date \| undefined` | See type | no | — | "Now" for relative times in the readout. Defaults to the clock. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called when retry occurs. The callback type specifies its arguments. |
| series | `readonly LineSeries[]` | See type | yes | — | Chart series with stable identifiers, labels and typed values. |
| stacked | `boolean \| undefined` | false, true | no | — | Stack the series as bands (parts of a total). Implies area. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| thresholds | `readonly Threshold[] \| undefined` | See type | no | — | Status bands. With one series, the line itself takes the tone above each threshold. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |
| x | `readonly XValue[]` | See type | yes | — | Shared x values, ascending: Dates for time series, numbers otherwise. |
| xLabel | `string \| undefined` | See type | no | "Time" | Label for x in the table and readout ("Time", "Sample"). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
