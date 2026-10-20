# BarChart

Columns and bars: grouped, stacked, and horizontal ranked lists ("top processes by memory").
Marks follow the family's spec — at most 24px thick, the data end rounded and the baseline
square, a 2px surface gap between touching marks, the light-from-above sheen of solid fills.

  micro    mini columns without axes; ranked lists add the leader as a trail
  compact  baseline and category labels (or, for ranked lists, label · bar · value rows);
           passive legend
  full     value gridlines, the interactive legend, a band highlight and the glass tooltip
           (every series in the band, a total when stacked)

Rows that do not fit in a ranked list fold into a "+N more" line — nothing is cut off.

`import { BarChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/bar-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| categories | `readonly string[]` | See type | yes | — | One label per band: days, processes, organisations. |
| categoryLabel | `string \| undefined` | See type | no | "Category" | Header for the category column of the table ("Process", "Day"). |
| domain | `Domain \| undefined` | See type | no | — | Fixed value range; defaults to zero → the data, rounded to nice ticks. |
| edges | `readonly number[] \| undefined` | See type | no | — | Bin edges for a histogram: n + 1 numbers; bars touch and the axis labels the edges. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number, locale: string) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). Receives the chart's resolved locale as its second argument. |
| formatEdge | `((value: number) => string) \| undefined` | See type | no | — | Format a bin edge. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| labels | `boolean \| undefined` | false, true | no | — | Values at the bar tips. Defaults on for horizontal bars (ranked lists), off for columns. |
| layout | `"grouped" \| "stacked" \| undefined` | "grouped", "stacked" | no | "grouped" | Several series side by side, or stacked as parts of a total. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this chart's numbers, dates and table. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| orientation | `"horizontal" \| "vertical" \| undefined` | "horizontal", "vertical" | no | "vertical" | `vertical` columns (time and ordered categories) or `horizontal` bars (ranked lists). |
| series | `readonly BarSeries[]` | See type | yes | — | Chart series with stable identifiers, labels and typed values. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
