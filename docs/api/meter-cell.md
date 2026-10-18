# MeterCell

A responsive table meter: the reading remains when the narrow cell drops its track. It
takes Meter's thresholds and `tone`; pass `tone="data"` where the column compares levels
in the data colour.

`import { MeterCell } from "glass-ux/meter-cell"`

[Live examples](https://dastari.github.io/glass-ux/components/meter-cell)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when there is no visible label. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| dangerAt | `number \| undefined` | See type | no | — | Threshold at which the value enters the danger state. |
| description | `string \| undefined` | See type | no | — | Full tooltip breakdown; defaults to the visible reading. |
| label | `string` | See type | yes | — | Accessible measurement name. |
| max | `number \| undefined` | See type | no | — | Upper value or visible-item limit, as specified by the type. |
| tone | `"data" \| "neutral" \| undefined` | "data", "neutral" | no | — | The bar's colour below the warning threshold. `neutral` (default) keeps a healthy level calm; `data` uses the first data colour (`--chart-1`) where the level is itself the data being compared, such as disk use in a table. Warning and danger apply past their thresholds either way. |
| value | `number` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |
| valueText | `string \| undefined` | See type | no | — | The reading, with units: "212 GB of 256 GB". Defaults to the percentage. |
| warningAt | `number \| undefined` | See type | no | — | Fraction of max where the bar turns warning (default 0.75) and danger (0.9). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
