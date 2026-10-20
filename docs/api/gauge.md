# Gauge

A level in a known range — disk 82%, memory, licence seats — as a 270° arc. It shares
Meter's thresholds and semantics: neutral while healthy (so a calm page stays calm, and a
red accent never reads as danger), warning then danger as the value crosses each threshold,
which is ticked beside the track so the reader sees how close it is. A gauge whose value is
not a state (warningAt={null}) wears the data colour, --chart-1.

  micro    an inline meter bar with the value as a trail
  compact  the arc with the value inside
  full     the arc, value, caption and the range's ends

`import { Gauge } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/gauge)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| caption | `string \| undefined` | See type | no | — | The reading in words under the value: "212 GB of 256 GB". |
| dangerAt | `number \| null \| undefined` | See type | no | 0.9 | Threshold at which the value enters the danger state. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number, locale: string) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). Receives the chart's resolved locale as its second argument. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this chart's numbers, dates and table. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| max | `number \| undefined` | See type | no | 100 | Upper value or visible-item limit, as specified by the type. |
| min | `number \| undefined` | See type | no | 0 | Lower allowed value. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |
| value | `number \| null` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |
| warningAt | `number \| null \| undefined` | See type | no | 0.75 | Fractions of the range where the gauge turns warning and danger (Meter's defaults). Pass null when the value is not a state: it then wears the data colour (--chart-1). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
