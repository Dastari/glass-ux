# LineChart

Lines and areas over time — one visual language with Sparkline: the same monotone curve,
2px stroke, gradient wash and ringed end dot, then axes, a legend and a crosshair as the
box grows.

  micro    the lines only (a multi-series sparkline) with the latest values as a trail
  compact  title, passive legend or latest value; the plot with its top gridline and the
           first and last x labels
  full     y gridlines and labels, x labels, threshold bands and markers, an interactive
           legend, the crosshair and the glass tooltip at the cursor (every visible series,
           one or more); with one series the hovered value also replaces the latest in the
           head (Metric's model)

`import { LineChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/line-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| area | `boolean \| undefined` | false, true | no | — | The Sparkline wash under each line. Defaults on for a single series. |
| domain | `Domain \| undefined` | See type | no | — | Fixed value range (percentages: [0, 100]). Defaults to the data, rounded to nice ticks. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number, locale: string) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). Receives the chart's resolved locale as its second argument. |
| formatX | `((x: number) => string) \| undefined` | See type | no | — | Format a numeric x. |
| gaps | `"break" \| "bridge" \| undefined` | "break", "bridge" | no | "break" | How a line meets missing samples (null). `break` (the default) leaves a hole. `bridge` joins the last reading before each gap to the first after it with a straight, muted dashed line that says "no samples here": it is never a value, so the crosshair, tooltip, readout and table still show none at a gap. Never before the first reading or after the last, and not for stacked charts. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this chart's numbers, dates and table. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| markers | `readonly Marker[] \| undefined` | See type | no | — | Events on the x axis. |
| maxBridge | `number \| undefined` | See type | no | — | With `gaps="bridge"`, bridge only gaps whose ends are at most this far apart, in x units (milliseconds for time). Default: every gap. |
| now | `Date \| undefined` | See type | no | — | "Now" for relative times in the readout. Defaults to the clock. |
| onActivate | `((index: number, x: XValue) => void) \| undefined` | See type | no | — | Click, Enter or Space on a point: its index and x (jump another view to that time). While set, the plot shows a pointer cursor and its accessible name says Enter selects. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| selected | `XValue \| readonly [XValue, XValue] \| undefined` | See type | no | — | The chosen x, drawn as a rule, or an [from, to] range, drawn as a band. |
| series | `readonly LineSeries[]` | See type | yes | — | Chart series with stable identifiers, labels and typed values. |
| stacked | `boolean \| undefined` | false, true | no | — | Stack the series as bands (parts of a total). Implies area. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| thresholds | `readonly Threshold[] \| undefined` | See type | no | — | Status bands. With one series, the line itself takes the tone above each threshold. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |
| x | `readonly XValue[]` | See type | yes | — | Shared x values, ascending: Dates for time series, numbers otherwise. |
| xLabel | `string \| undefined` | See type | no | — | Label for x in the table and readout ("Time", "Sample"). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
