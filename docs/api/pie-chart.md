# PieChart

Pie and donut: a part-to-whole at a glance (six slices or fewer; the tail folds into
"Other"). The donut's centre is Metric's value: hovering a slice, or arrowing to it,
replaces the total with that slice's value and share.

  micro    a proportion strip with the leading share as a trail
  compact  the ring with its centre value, a key beside it when there is room
  full     the ring, centre readout, and a list legend with values and shares that
           highlights with the ring

`import { PieChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/pie-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| categoryLabel | `string \| undefined` | See type | no | "Category" | Header for the table's first column. |
| centre | `{ value: string; label: string; } \| undefined` | See type | no | — | What the centre says when nothing is hovered. Defaults to the total. |
| data | `readonly PieSlice[]` | See type | yes | — | Typed records rendered by the component. |
| donut | `boolean \| undefined` | false, true | no | false | A ring with the total (or `centre`) inside. Pie is the solid disc. |
| emptyText | `ReactNode` | false, true | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | false, true | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| maxSlices | `number \| undefined` | See type | no | 6 | Slices past this fold into "Other" (part-to-whole reads at six or fewer). |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called when retry occurs. The callback type specifies its arguments. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| totalLabel | `string \| undefined` | See type | no | "Total" | Label under the centre total ("Endpoints"). |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
