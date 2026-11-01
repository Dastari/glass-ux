# RadarChart

Several measures on one scale, as a profile: the first spoke points up and the rest follow
clockwise, as a pie's slices do. Rings mark the scale, each series is an outline with a
wash, and pointing at a series in the legend brings it forward. Use it to compare the shape
of a few profiles; for exact amounts, or spokes whose order means nothing to the reader,
`BarChart` reads better.

The ring does not mirror in right-to-left text: its order runs clockwise from the top, and
position around a circle has no reading direction.

  micro    the outlines alone in a small ring; the first series' largest measure as a trail
  compact  rim, spokes and measure labels where they fit, passive legend
  full     rings with their values, measure labels, the interactive legend, the tooltip
           (every series at the spoke) and arrow keys that move to the spoke in that direction

`import { RadarChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/radar-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| domain | `Domain \| undefined` | See type | no | — | Fixed value range; the low end sits at the centre. Defaults to zero → the data, rounded to nice ticks. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number, locale: string) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). Receives the chart's resolved locale as its second argument. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this chart's numbers, dates and table. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| measureLabel | `string \| undefined` | See type | no | — | Header for the table's first column. |
| measures | `readonly string[]` | See type | yes | — | One label per spoke: three to ten read well. All share one scale, so compare like with like. |
| onActivate | `((index: number, measure: string) => void) \| undefined` | See type | no | — | Click, Enter or Space on a spoke: its index and measure. While set, the plot shows a pointer cursor and its accessible name says Enter selects. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| series | `readonly RadarSeries[]` | See type | yes | — | The series to overlay: two or three stay legible, since each outline hides what is behind it. |
| state | `ChartState \| undefined` | "error", "loading", "ready", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
