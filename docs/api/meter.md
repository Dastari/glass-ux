# Meter

A level within a known range: disk, memory, licence seats. Neutral while healthy (or the
data colour with `tone="data"`); the bar turns warning and danger as it crosses its
thresholds, and the threshold is marked on the track so the reader sees how close it is.

`import { Meter } from "glass-ux/meter"`

[Live examples](https://dastari.github.io/glass-ux/components/meter)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when there is no visible label. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| dangerAt | `number \| undefined` | See type | no | 0.9 | Threshold at which the value enters the danger state. |
| label | `ReactNode` | See type | no | — | What is measured: "C: · Local disk", "Memory". |
| layout | `"inline" \| "stacked" \| undefined` | "inline", "stacked" | no | "stacked" | `stacked`: label and reading above the bar. `inline`: bar then reading on one line — for table cells and dense lists. |
| max | `number \| undefined` | See type | no | 100 | Upper value or visible-item limit, as specified by the type. |
| tone | `"data" \| "neutral" \| undefined` | "data", "neutral" | no | "neutral" | The bar's colour below the warning threshold. `neutral` (default) keeps a healthy level calm; `data` uses the first data colour (`--chart-1`) where the level is itself the data being compared, such as disk use in a table. Warning and danger apply past their thresholds either way. |
| value | `number` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |
| valueText | `string \| undefined` | See type | no | — | The reading, with units: "212 GB of 256 GB". Defaults to the percentage. |
| warningAt | `number \| undefined` | See type | no | 0.75 | Fraction of max where the bar turns warning (default 0.75) and danger (0.9). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
