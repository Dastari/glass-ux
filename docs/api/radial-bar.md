# RadialBar

Several levels as concentric 270° rings, outermost first — CPU, memory and disk on one
endpoint. Each ring is its own series (a categorical slot); with thresholds, a ring past one
takes the status tone instead.

  micro    one thin meter per item, stacked, with the highest share as a trail
  compact  the rings with their labels in the open quadrant
  full     the rings, labels with values, and a list legend

`import { RadialBar } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/radial-bar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| dangerAt | `number \| undefined` | See type | no | — | Threshold at which the value enters the danger state. |
| data | `readonly RadialBarItem[]` | See type | yes | — | Typed records rendered by the component. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called when retry occurs. The callback type specifies its arguments. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |
| warningAt | `number \| undefined` | See type | no | — | Turn a ring warning/danger past these fractions of its max (status data only). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
