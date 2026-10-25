# ColumnChart

Vertical columns.

`import { ColumnChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/column-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| bands | `readonly ReferenceBand[] \| undefined` | See type | no | — | Shaded ranges on the value axis behind the columns. Vertical columns only. |
| categories | `readonly string[]` | See type | yes | — | One label per band: days, processes, organisations. |
| categoryLabel | `string \| undefined` | See type | no | — | Header for the category column of the table ("Process", "Day"). |
| domain | `Domain \| undefined` | See type | no | — | Fixed value range; defaults to zero → the data, rounded to nice ticks. |
| edges | `readonly number[] \| undefined` | See type | no | — | Bin edges for a histogram: n + 1 numbers; bars touch and the axis labels the edges. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number, locale: string) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). Receives the chart's resolved locale as its second argument. |
| formatEdge | `((value: number) => string) \| undefined` | See type | no | — | Format a bin edge. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| labels | `boolean \| undefined` | false, true | no | — | Values at the bar tips. Defaults on for horizontal bars (ranked lists), off for columns. |
| layout | `"grouped" \| "stacked" \| undefined` | "grouped", "stacked" | no | — | Several series side by side, or stacked as parts of a total. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this chart's numbers, dates and table. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| series | `readonly BarSeries[]` | See type | yes | — | Chart series with stable identifiers, labels and typed values. |
| state | `ChartState \| undefined` | "error", "loading", "ready", "empty" | no | — | Controlled view state, including loading, empty and error states. |
| thresholds | `readonly Threshold[] \| undefined` | See type | no | — | Lines across the columns at values (a quota, a target), labelled at the line's end. Vertical columns only. A status tone without `bands` shades the range up to the next status threshold. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
