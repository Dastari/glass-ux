# Heatmap

Magnitude over two categories — alerts per hour by kind, CPU per hour by endpoint. One hue
(the data colour, --chart-1), light to strong in a few discrete steps; zero is the empty track colour so
quiet hours read as quiet. A step legend sits in the head.

  micro    one strip: each column's total across the rows
  compact  the grid, row labels where they fit, passive
  full     row and column labels, the step legend, the cell tooltip and 2-D arrow keys

`import { Heatmap } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/heatmap)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| columnLabel | `string \| undefined` | See type | no | "Time" | Accessible name or label definition for a column. |
| columns | `readonly XValue[]` | See type | yes | — | One per column: hours (Dates) or labels. |
| domain | `readonly [number, number] \| undefined` | See type | no | — | Value range for the colour scale; defaults to [0, max]. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number, locale: string) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). Receives the chart's resolved locale as its second argument. |
| formatColumn | `((column: XValue) => string) \| undefined` | See type | no | — | Format a column for labels and the readout. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this chart's numbers, dates and table. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| rowLabel | `string \| undefined` | See type | no | "Category" | Accessible name or label definition for a row. |
| rows | `readonly string[]` | See type | yes | — | One label per row: alert categories, services, endpoints. |
| state | `ChartState \| undefined` | "error", "loading", "ready", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| steps | `number \| undefined` | See type | no | 5 | Colour steps, 3–7 (past seven, neighbouring steps blur). |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |
| values | `readonly (readonly (number \| null)[])[]` | See type | yes | — | values[row][column]; null is "no data" (drawn as an empty cell). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
