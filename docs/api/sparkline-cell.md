# SparklineCell

The shared Sparkline at row size plus its current value, right-aligned in tabular
figures. The line's accessible name summarises it: now, low and high.

`import { SparklineCell } from "glass-ux/data-table"`

[Live examples](https://dastari.github.io/glass-ux/components/sparkline-cell)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| domain | `Domain \| undefined` | See type | no | — | Fixed value range ([0, 100] for percentages). Defaults to the data's range. |
| label | `string` | See type | yes | — | What the series is, e.g. "CPU over the last 20 minutes". |
| tone | `SparklineTone \| undefined` | "data", "danger", "warning", "success", "neutral", "accent", "info" | no | "neutral" | Line colour. Neutral by default so a column of trends reads as texture; use a status tone only while the value is in that state (R3.3), so problems stand out. |
| unit | `string \| undefined` | See type | no | — | Unit after a thin space: "%", "ms". |
| value | `number \| undefined` | See type | no | — | The value printed beside the line (defaults to the last point). |
| values | `readonly number[]` | See type | yes | — | Values rendered by the chart or multi-value control. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
