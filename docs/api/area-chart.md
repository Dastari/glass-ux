# AreaChart

An area chart: the line chart with its wash (and `stacked` for parts of a total).

`import { AreaChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/area-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| area | `boolean \| undefined` | false, true | no | — | The Sparkline wash under each line. Defaults on for a single series. |
| domain | `Domain \| undefined` | See type | no | — | Fixed value range (percentages: [0, 100]). Defaults to the data, rounded to nice ticks. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). |
| formatX | `((x: number) => string) \| undefined` | See type | no | — | Format a numeric x. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| markers | `readonly Marker[] \| undefined` | See type | no | — | Events on the x axis. |
| now | `Date \| undefined` | See type | no | — | "Now" for relative times in the readout. Defaults to the clock. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| series | `readonly LineSeries[]` | See type | yes | — | Chart series with stable identifiers, labels and typed values. |
| stacked | `boolean \| undefined` | false, true | no | — | Stack the series as bands (parts of a total). Implies area. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | — | Controlled view state, including loading, empty and error states. |
| thresholds | `readonly Threshold[] \| undefined` | See type | no | — | Status bands. With one series, the line itself takes the tone above each threshold. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |
| x | `readonly XValue[]` | See type | yes | — | Shared x values, ascending: Dates for time series, numbers otherwise. |
| xLabel | `string \| undefined` | See type | no | — | Label for x in the table and readout ("Time", "Sample"). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
