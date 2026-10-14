# Surface

A piece of glass. Picks a material from glass.css and a radius role; layout is the
caller's. Prefer Panel for content panes — it adds the header/body/footer slots.

`import { Surface } from "glass-ux/surface"`

[Live examples](https://dastari.github.io/glass-ux/components/surface)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| as | `T \| undefined` | See type | no | — | Semantic element rendered by the polymorphic component. |
| container | `boolean \| undefined` | false, true | no | false | Make this surface a size container so its contents can respond with |
| material | `SurfaceMaterial \| undefined` | "control", "chrome", "panel", "overlay", "float", "inset" | no | "panel" | Shared glass material applied to the surface. |
| padding | `SurfacePadding \| undefined` | "dialog", "none", "tile", "panel" | no | "none" | Semantic padding role. |
| radius | `SurfaceRadius \| undefined` | "dialog", "none", "control", "tile", "surface", "overlay" | no | "surface" | Semantic corner-radius role. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
