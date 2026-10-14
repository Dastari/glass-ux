# GeoMapSkeleton

The map's box before anything is known: the same size, a silhouette when the region is.

`import { GeoMapSkeleton } from "glass-ux/map"`

[Live examples](https://dastari.github.io/glass-ux/components/geo-map-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| insets | `MapInsets \| undefined` | See type | no | — | Space reserved around the content or plot. |
| region | `MapRegion \| null \| undefined` | See type | no | — | Geographical region to display. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
