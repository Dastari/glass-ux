# DefaultClusterPopup

A cluster's contents: the status breakdown and its points, worst first.

`import { DefaultClusterPopup } from "glass-ux/map"`

[Live examples](https://dastari.github.io/glass-ux/components/default-cluster-popup)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| cluster | `MapCluster<T>` | See type | yes | — | Aggregate cluster represented by the marker. |
| counts | `Readonly<Record<"danger" \| "warning" \| "healthy" \| "unknown", number>>` | See type | yes | — | Counts grouped by category or status. |
| labels | `Readonly<Record<"danger" \| "warning" \| "healthy" \| "unknown", string>>` | See type | yes | — | Display and accessibility labels supplied by the application. |
| noun | `MapNoun` | See type | yes | — | Singular and plural names used in counts and accessible labels. |
| onOpen | `(point: MapPoint<T>) => void` | See type | yes | — | Called when open occurs. The callback type specifies its arguments. |
| onZoom | `() => void` | See type | yes | — | Called when zoom occurs. The callback type specifies its arguments. |
| size | `number` | See type | yes | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
