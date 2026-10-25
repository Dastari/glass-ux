# RadialBar

Several levels as concentric 270° rings, outermost first — CPU, memory and disk on one
endpoint. Each ring is its own series (a categorical slot); with thresholds, a ring past one
takes the status tone instead.

  micro    one thin meter per item, stacked, with the highest share as a trail
  compact  the rings with their labels in the open quadrant
  full     the rings, labels with values, and a list legend

`import { RadialBar } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/radial-bar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| dangerAt | `number \| undefined` | See type | no | — | Threshold at which the value enters the danger state. |
| data | `readonly RadialBarItem[]` | See type | yes | — | Typed records rendered by the component. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number, locale: string) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). Receives the chart's resolved locale as its second argument. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this chart's numbers, dates and table. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| state | `ChartState \| undefined` | "error", "loading", "ready", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |
| warningAt | `number \| undefined` | See type | no | — | Turn a ring warning/danger past these fractions of its max (status data only). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
