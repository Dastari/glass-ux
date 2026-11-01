# SankeyChart

How amounts divide and join across stages: nodes in columns, ribbons as wide as what flows
through them. Nodes stay in the column of their longest path, and those with nothing
leaving stand in the last. Ribbons take their source's colour. Pointing at a node lifts its
flows. Past eight groups, colour stops telling nodes apart, so give related nodes a `group`;
labels name each node where they fit, and the tooltip and table always do.

Hiding a group in the legend removes its nodes and every flow that touches them, and the
rest re-lay. Hidden flows are not reassigned, so a neighbour's total shrinks with them.

The flow runs with the reading direction: in right-to-left text it starts on the right.
Arrow keys move on screen in the direction pressed, through nodes and the flows between.

  micro    a proportion strip of the first column, with the total as a trail
  compact  nodes, ribbons and the labels that fit, passive
  full     labels with values, the interactive legend, the tooltip and arrow keys

`import { SankeyChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/sankey-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number, locale: string) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). Receives the chart's resolved locale as its second argument. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| links | `readonly SankeyLink[]` | See type | yes | — | The flows. A link that closes a loop cannot be drawn: it stays in the table, and the chart says how many were left out. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this chart's numbers, dates and table. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| nodes | `readonly SankeyNode[]` | See type | yes | — | The stages or categories flows pass through. A node without a link is not drawn. |
| onActivate | `((target: SankeyTarget) => void) \| undefined` | See type | no | — | Click, Enter or Space on a node or a flow. While set, the plot's accessible name says Enter selects. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| sourceLabel | `string \| undefined` | See type | no | — | Header for the table's source column. |
| state | `ChartState \| undefined` | "error", "loading", "ready", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| targetLabel | `string \| undefined` | See type | no | — | Header for the table's target column. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
