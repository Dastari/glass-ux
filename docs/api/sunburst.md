# Sunburst

Rings of a hierarchy around its centre — DaisyDisk for disk usage. Each child of the focus
owns a hue and its descendants ring outward in fading steps of it. The centre is Metric's
value: the focus and its size, replaced by whatever the pointer (or arrow keys) is on. Click
or Enter drills into an arc; the centre, the path, Backspace and Escape go back.

  micro    a proportion strip of the focus's children
  compact  two rings and the centre, passive
  full     three rings, the centre readout, the drill path, the children as a list and
           the glass tooltip with the arc at the cursor

`import { Sunburst } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/sunburst)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| colourBy | `ColourBy \| undefined` | "group", "branch", "depth" | no | "branch" | Strategy used to assign colours to hierarchical data. |
| data | `HierarchyDatum` | See type | yes | — | Typed records rendered by the component. |
| depth | `number \| undefined` | See type | no | 3 | Rings drawn below the focus at the full tier (compact draws two). |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number, locale: string) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). Receives the chart's resolved locale as its second argument. |
| groups | `readonly string[] \| undefined` | See type | no | — | Action groups in display order. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for this chart's numbers, dates and table. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| nameLabel | `string \| undefined` | See type | no | "Name" | Display label for the name field. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called with no arguments when the person presses Retry in the error state. The button appears only when this is set, `state` is "error" and the tier is not micro. |
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
