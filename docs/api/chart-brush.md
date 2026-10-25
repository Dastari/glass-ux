# ChartBrush

An overview strip with a draggable, resizable window that drives a chart's x domain:
pass the same `value` to the charts' `xDomain` to show one range in several charts.
LineChart and AreaChart draw one under the plot with `brush`.

`import { ChartBrush } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/chart-brush)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultValue | `XDomain \| null \| undefined` | See type | no | — | The uncontrolled starting window. |
| domain | `Domain \| undefined` | See type | no | — | Fixed value range for the strip's line. Defaults to the data's. |
| formatX | `((x: number) => string) \| undefined` | See type | no | — | Format a numeric x for the handles' values. |
| label | `string` | See type | yes | — | Accessible name of the strip: "CPU · NST-C106 · overview". |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for the handles' values. Default: the nearest LocaleProvider. |
| onValueChange | `((domain: XDomain \| null) => void) \| undefined` | See type | no | — | Called once per change (on release, or per key), with null for the whole range. |
| series | `readonly BrushSeries[]` | See type | yes | — | The series drawn in the strip; the first gets the wash when it is the only one. |
| value | `XDomain \| null \| undefined` | See type | no | — | Controlled window: null shows the whole range. Leave undefined for uncontrolled. |
| x | `readonly XValue[]` | See type | yes | — | The x values of the whole range, ascending: Dates for time, numbers otherwise. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
