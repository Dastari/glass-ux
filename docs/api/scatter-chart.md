# ScatterChart

Two measures per item — CPU against memory for every endpoint. 8px dots ringed in the
surface colour so overlaps stay legible; the pointer only has to be nearest, not on the dot.

  micro    the dots alone
  compact  the dots over a baseline, passive legend
  full     both axes with their names, the interactive legend, nearest-dot tooltip, and the
           arrow keys stepping through dots left to right

`import { ScatterChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/scatter-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called when retry occurs. The callback type specifies its arguments. |
| series | `readonly ScatterSeries[]` | See type | yes | — | Three series at most: any two dots can sit side by side, so every pair must differ. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| x | `ScatterAxis` | See type | yes | — | Horizontal coordinate or accessor. |
| y | `ScatterAxis` | See type | yes | — | Vertical coordinate or accessor. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
