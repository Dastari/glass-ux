# PieChart

Pie and donut: a part-to-whole at a glance (six slices or fewer; the tail folds into
"Other"). The donut's centre is Metric's value: hovering a slice, or arrowing to it,
replaces the total with that slice's value and share.

  micro    a proportion strip with the leading share as a trail
  compact  the ring with its centre value, a key beside it when there is room
  full     the ring, centre readout, a list legend with values and shares that
           highlights with the ring, and the glass tooltip with the slice at the cursor

`import { PieChart } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/pie-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| categoryLabel | `string \| undefined` | See type | no | — | Header for the table's first column. |
| centre | `{ value: string; label: string; } \| undefined` | See type | no | — | What the centre says when nothing is hovered. Defaults to the total. |
| data | `readonly PieSlice[]` | See type | yes | — | Typed records rendered by the component. |
| donut | `boolean \| undefined` | false, true | no | false | A ring with the total (or `centre`) inside. Pie is the solid disc. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number, locale: string) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). Receives the chart's resolved locale as its second argument. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this chart's numbers, dates and table. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| maxSlices | `number \| undefined` | See type | no | 6 | Slices past this fold into "Other" (part-to-whole reads at six or fewer). |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
| state | `ChartState \| undefined` | "error", "loading", "ready", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| totalLabel | `string \| undefined` | See type | no | — | Label under the centre total ("Endpoints"). |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
