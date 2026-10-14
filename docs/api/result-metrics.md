# ResultMetrics

Key figures from a tool: Metric tiles (src/ui/metric) in an auto-fill grid. Each tile has
a definite height, so Metric picks its own tier (value + delta + sparkline) and the grid
reflows by the card's width, never a fixed column count (R5.5).

`import { ResultMetrics } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-metrics)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "metrics"; metrics: import("../types.js").ResultMetricItem[]; }` | See type | yes | — | Typed result, including disclosure and rendering metadata. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
