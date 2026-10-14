# ColumnChart

Vertical columns.

`import { ColumnChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/column-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| categories | `readonly string[]` | See type | yes | — | One label per band: days, processes, organisations. |
| categoryLabel | `string \| undefined` | See type | no | — | Header for the category column of the table ("Process", "Day"). |
| domain | `Domain \| undefined` | See type | no | — | Fixed value range; defaults to zero → the data, rounded to nice ticks. |
| edges | `readonly number[] \| undefined` | See type | no | — | Bin edges for a histogram: n + 1 numbers; bars touch and the axis labels the edges. |
| emptyText | `ReactNode` | false, true | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | false, true | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). |
| formatEdge | `((value: number) => string) \| undefined` | See type | no | — | Format a bin edge. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| labels | `boolean \| undefined` | false, true | no | — | Values at the bar tips. Defaults on for horizontal bars (ranked lists), off for columns. |
| layout | `"grouped" \| "stacked" \| undefined` | "grouped", "stacked" | no | — | Several series side by side, or stacked as parts of a total. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called when retry occurs. The callback type specifies its arguments. |
| series | `readonly BarSeries[]` | See type | yes | — | Chart series with stable identifiers, labels and typed values. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | — | Controlled view state, including loading, empty and error states. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
