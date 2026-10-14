# Sparkline

A single-series line that fills its box: smooth (monotone, no overshoot), 2px whatever
the size, a wash of the data colour beneath and a ringed dot on the latest point. Pure SVG + CSS; the
plot is inset by the dot's radius so nothing is ever cut off at the edges.

`import { Sparkline } from "glass-ux/sparkline"`

[Live examples](https://dastari.github.io/glass-ux/components/sparkline)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| area | `boolean \| undefined` | false, true | no | true | The ~10% wash under the line. |
| data | `readonly number[]` | See type | yes | — | Typed records rendered by the component. |
| domain | `Domain \| undefined` | See type | no | — | Fixed value range (e.g. [0, 100] for percentages). Defaults to the data's range. |
| dot | `boolean \| undefined` | false, true | no | true | The ringed dot on the latest point. |
| hover | `number \| null \| undefined` | See type | no | null | Index under the crosshair; null hides it. Controlled by the parent (Metric). |
| label | `string \| undefined` | See type | no | — | Accessible summary. Omit when a parent already describes the chart. |
| onHover | `((index: number \| null) => void) \| undefined` | See type | no | — | Turn on pointer hit-testing; called with the nearest index, or null on leave. |
| reference | `number \| undefined` | See type | no | — | A horizontal hairline at this value (e.g. the average). |
| tone | `SparklineTone \| undefined` | "data", "danger", "warning", "success", "neutral", "accent", "info" | no | "data" | Line colour: the data colour, or a status tone only when the series is in that state. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
