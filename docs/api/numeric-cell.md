# NumericCell

A number in tabular figures with its unit. Pair with `align: "end"` on the column.

`import { NumericCell } from "glass-ux/data-table"`

[Live examples](https://dastari.github.io/glass-ux/components/numeric-cell)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| fallback | `string \| undefined` | See type | no | "—" | Text for a missing value. |
| fractionDigits | `number \| undefined` | See type | no | 0 | Number of fractional digits displayed. |
| unit | `string \| undefined` | See type | no | — | Unit after a thin space: "GB", "ms", "%". |
| value | `number \| null \| undefined` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
