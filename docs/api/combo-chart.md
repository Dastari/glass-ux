# ComboChart

Columns and lines over the same categories, on one value axis or two: orders per month as
columns with the refund rate as a line. It is `BarChart` with vertical columns, so grouped
and stacked columns, thresholds and tiers work as they do there. Give each series a `mark`
and, for a second axis, `axis: "secondary"` and `secondaryAxis`.

Two axes need care: their scales are independent, so where a line crosses a column, and how
steep it looks beside it, says nothing about the data. Use them for two measures of one
process that differ in unit and a reader compares by shape over the categories. Do not use
them to compare two amounts of the same unit (use one axis), to suggest one measure drives
another (use `ScatterChart`), or with more than one or two series a side: small multiples,
two charts stacked over the same categories, read better. Each axis wears a key for the
series it carries, the second axis's labels sit on the first's gridlines unless both ranges
are fixed, and both ranges start at zero unless you fix them.

Each axis needs its name (`valueLabel`, `secondaryAxis.label`). The table's columns name
each series' axis and unit, and thresholds and bands read the primary axis. The x axis and
the value axes do not mirror in right-to-left text: the primary axis stays on the left.

  micro    columns and lines without axes; the first series' latest value as a trail
  compact  baseline and category labels, passive legend
  full     both value axes with their names, the interactive legend naming each series'
           axis, a band highlight and the tooltip (every series in its own unit)

`import { ComboChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/combo-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| bands | `readonly ReferenceBand[] \| undefined` | See type | no | — | Shaded ranges on the value axis behind the columns. Vertical columns only. Thresholds and bands read the primary axis. |
| categories | `readonly string[]` | See type | yes | — | One label per band: days, processes, organisations. |
| categoryLabel | `string \| undefined` | See type | no | — | Header for the category column of the table ("Process", "Day"). |
| domain | `Domain \| undefined` | See type | no | — | Fixed value range; defaults to zero → the data, rounded to nice ticks. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number, locale: string) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). Receives the chart's resolved locale as its second argument. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| layout | `"grouped" \| "stacked" \| undefined` | "grouped", "stacked" | no | — | Several series side by side, or stacked as parts of a total. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this chart's numbers, dates and table. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| onActivate | `((index: number, category: string) => void) \| undefined` | See type | no | — | Click, Enter or Space on a category: its index and label. While set, the plot shows a pointer cursor and its accessible name says Enter selects. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| secondaryAxis | `ValueAxis \| undefined` | See type | no | — | A second value axis at the plot's right edge, for series with `axis: "secondary"`. It has its own name, unit and format; its gridline positions follow the primary axis's. Vertical columns only. See `ComboChart` for when two axes mislead. |
| series | `readonly BarSeries[]` | See type | yes | — | Chart series with stable identifiers, labels and typed values. |
| state | `ChartState \| undefined` | "error", "loading", "ready", "empty" | no | — | Controlled view state, including loading, empty and error states. |
| thresholds | `readonly Threshold[] \| undefined` | See type | no | — | Lines across the columns at values (a quota, a target), labelled at the line's end. Vertical columns only. A status tone without `bands` shades the range up to the next status threshold. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |
| valueLabel | `string` | See type | yes | — | Names the primary value axis. Required: on a chart that mixes measures, no axis goes unnamed. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
