# ResultChart

A line or bar chart for a tool result. Thin marks (2px lines, bars at most 24px with a
rounded data end), hairline grid, one axis, a legend from two series, and a hover readout.
Container tiers: compact cards drop the value axis and thin the time labels; the chart
box keeps a fixed height per tier so it reserves its space before data arrives.

`import { ResultChart } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-chart)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "chart"; chart: "line" \| "bar"; labels: string[]; series: ChartSeries[]; unit?: string; domain?: [number, number]; }` | See type | yes | — | Typed result, including disclosure and rendering metadata. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
