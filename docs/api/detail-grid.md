# DetailGrid

Tiles in an auto-fill grid that reflows with its container (R5.5): as many columns as fit
at the minimum tile width, never a fixed count.

`import { DetailGrid } from "glass-ux/detail-tile"`

[Live examples](https://dastari.github.io/glass-ux/components/detail-grid)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| min | `"sm" \| "md" \| "lg" \| undefined` | "sm", "md", "lg" | no | "md" | Smallest tile width before the grid drops a column. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
