# GeoMapSkeleton

The map's box before anything is known: the same size, a silhouette when the region is.

`import { GeoMapSkeleton } from "glass-ux/map"`

[Live examples](https://dastari.github.io/glass-ux/components/geo-map-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| insets | `MapInsets \| undefined` | See type | no | — | Page chrome over the map in CSS pixels, matching the GeoMap's `insets` so the placeholder frames the same way. |
| region | `MapRegion \| null \| undefined` | See type | no | — | Region drawn as a silhouette; omit or pass `null` for an empty box. |
