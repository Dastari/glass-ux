# MapSilhouette

The home region as a static outline, framed exactly like the map's first view: an SVG inset
by the fit padding whose viewBox is the framed box (`xMidYMid meet` is fitBounds).
Outside a map it fills its container, which must give it a definite height.

`import { MapSilhouette } from "glass-ux/map"`

[Live examples](https://dastari.github.io/glass-ux/components/map-silhouette)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| box | `LngLatBox \| undefined` | See type | no | — | The box the camera will frame (defaults to the region's focus). |
| region | `MapRegion \| null \| undefined` | See type | yes | — | Geographical region to display. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
