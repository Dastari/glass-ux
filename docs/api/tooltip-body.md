# TooltipBody

The standard tooltip body: a heading (the x or category), then one row per series.

`import { TooltipBody } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/tooltip-body)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| footer | `ReactNode` | See type | no | — | Content below the rows (a total, a hint); omitted when empty. |
| meta | `ReactNode` | See type | no | — | Secondary text beside the title in the heading (a time range, a unit). |
| rows | `readonly TooltipRow[]` | See type | yes | — | One row per series: swatch, value, label and optional detail, in order. |
| title | `ReactNode` | See type | no | — | The heading or title content. |
