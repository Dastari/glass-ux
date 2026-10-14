# TooltipBody

The standard tooltip body: a heading (the x or category), then one row per series.

`import { TooltipBody } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/tooltip-body)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| footer | `ReactNode` | false, true | no | — | Content after the body, normally supporting actions. |
| meta | `ReactNode` | false, true | no | — | Supporting data displayed with the item. |
| rows | `readonly TooltipRow[]` | See type | yes | — | Records or matrix rows in display order. |
| title | `ReactNode` | false, true | no | — | The heading or title content. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
