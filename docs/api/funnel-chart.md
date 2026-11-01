# FunnelChart

Stages that narrow, each drawn to scale with the largest: sign-ups through to activation.
Rows read in order, top to bottom. Each names its stage and its value and share of the
first; the band between two bars carries the step's rate where there is room. Hiding a
stage in the legend drops it from the rates, so a reader can compare the stages either side
of it; the table keeps every stage.

Label and value columns and `align="start"` follow the reading direction.

  micro    falling columns; the last stage's share of the first as a trail
  compact  labelled rows, passive; the label stands over its bar when the box is narrow
  full     rows with shares and step rates, the interactive legend, the tooltip and arrow
           keys: up and down move by stage, and left and right follow reading order

`import { FunnelChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/funnel-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"start" \| "centre" \| undefined` | "start", "centre" | no | "centre" | `centre` (the default) draws the funnel's silhouette; `start` lines the bars up at one edge, for reading amounts exactly. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number, locale: string) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). Receives the chart's resolved locale as its second argument. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this chart's numbers, dates and table. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| onActivate | `((index: number, key: string) => void) \| undefined` | See type | no | — | Click, Enter or Space on a stage: its index and key. While set, the plot shows a pointer cursor and its accessible name says Enter selects. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| stageLabel | `string \| undefined` | See type | no | — | Header for the table's first column. |
| stages | `readonly FunnelStage[]` | See type | yes | — | The stages in order, widest first. A later stage larger than an earlier one is drawn as it is, with a rate past 100%. |
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
