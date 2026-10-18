# DonutChart

Display a part-to-whole dataset as a ring, with responsive legends, an accessible data table and optional centre content.

`import { DonutChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/donut-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| categoryLabel | `string \| undefined` | See type | no | — | Header for the table's first column. |
| centre | `{ value: string; label: string; } \| undefined` | See type | no | — | What the centre says when nothing is hovered. Defaults to the total. |
| data | `readonly PieSlice[]` | See type | yes | — | Typed records rendered by the component. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| maxSlices | `number \| undefined` | See type | no | — | Slices past this fold into "Other" (part-to-whole reads at six or fewer). |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | — | Controlled view state, including loading, empty and error states. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| totalLabel | `string \| undefined` | See type | no | — | Label under the centre total ("Endpoints"). |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
