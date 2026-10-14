# Histogram

How values spread — check-in latency across the fleet. Columns touch (the 2px surface gap
between them), the axis labels the bin edges, and the tooltip names the bin's range and
count. Tiers are the column chart's.

`import { Histogram } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/histogram)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| bins | `number \| undefined` | See type | no | 12 | About how many bins (d3 picks nice edges near this). |
| countLabel | `string \| undefined` | See type | no | "Count" | What is counted: "Endpoints", "Check-ins". |
| domain | `Domain \| undefined` | See type | no | — | The x range to bin over; defaults to the data's extent. |
| emptyText | `ReactNode` | false, true | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | false, true | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called when retry occurs. The callback type specifies its arguments. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | — | Controlled view state, including loading, empty and error states. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |
| values | `readonly number[]` | See type | yes | — | The raw values; they are binned here. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
