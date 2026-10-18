# ChartLegend

Series identity for two or more series (a single series needs no legend: the title names
it). Interactive at the full tier: each item toggles its series (aria-pressed); the legend
is one tab stop and the arrow keys move between items (R11.5). Keyboard focus emphasises
a series the same way hover does. The last visible series cannot be hidden, so the chart
is never empty by accident; its tooltip and description say why.

`import { ChartLegend } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/chart-legend)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| active | `string \| null \| undefined` | See type | no | — | Highlight one item (the hovered segment). |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| hidden | `ReadonlySet<string> \| undefined` | See type | no | — | Keys currently hidden. |
| items | `readonly LegendItem[]` | See type | yes | — | The collection rendered by the component. Stable identifiers preserve selection and keyboard focus. |
| layout | `"list" \| "row" \| undefined` | "list", "row" | no | "row" | `row`: one line in the head, truncating; `list`: a column with values (pie, donut). |
| onActive | `((key: string \| null) => void) \| undefined` | See type | no | — | Called when active occurs. The callback type specifies its arguments. |
| onToggle | `((key: string) => void) \| undefined` | See type | no | — | Makes the legend a toolbar of toggles (full tier). Omit for a passive key. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
