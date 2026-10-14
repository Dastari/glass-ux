# Sunburst

Rings of a hierarchy around its centre — DaisyDisk for disk usage. Each child of the focus
owns a hue and its descendants ring outward in fading steps of it. The centre is Metric's
value: the focus and its size, replaced by whatever the pointer (or arrow keys) is on. Click
or Enter drills into an arc; the centre, the path, Backspace and Escape go back.

  micro    a proportion strip of the focus's children
  compact  two rings and the centre, passive
  full     three rings, the centre readout, the drill path and the children as a list

`import { Sunburst } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/sunburst)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| colourBy | `ColourBy \| undefined` | "group", "branch", "depth" | no | "branch" | Strategy used to assign colours to hierarchical data. |
| data | `HierarchyDatum` | See type | yes | — | Typed records rendered by the component. |
| depth | `number \| undefined` | See type | no | 3 | Rings drawn below the focus at the full tier (compact draws two). |
| emptyText | `ReactNode` | false, true | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | false, true | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). |
| groups | `readonly string[] \| undefined` | See type | no | — | Action groups in display order. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| nameLabel | `string \| undefined` | See type | no | "Name" | Display label for the name field. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called when retry occurs. The callback type specifies its arguments. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
