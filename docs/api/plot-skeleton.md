# PlotSkeleton

The plot's placeholder: the chart's own shape in the plot's exact box (R9.3), so swapping
in the data moves nothing. Built from Skeleton parts; the shimmer is the page's one beat.

`import { PlotSkeleton } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/plot-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| kind | `ChartKind` | "line", "column", "bar", "pie", "gauge", "heatmap", "scatter", "treemap", "sunburst" | yes | — | Chart shape family; picks the placeholder marks. |
| tier | `ChartTier` | "full", "compact", "micro" | yes | — | Size tier of the box; axes placeholders show only in `full` for line, column, scatter and heatmap charts. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
