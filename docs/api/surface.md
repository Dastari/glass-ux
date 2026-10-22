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
| glass | `"full" \| "reduced" \| "solid" \| undefined` | "full", "reduced", "solid" | no | — | This surface's own material level, for itself and what it contains: `full` (Glass), `reduced` (Frosted) or `solid`. Never more transparent than the page's level, which a person may have chosen: on a Frosted page a `full` surface stays Frosted. Default: the page's. |
| material | `SurfaceMaterial \| undefined` | "control", "overlay", "chrome", "panel", "card", "float", "inset" | no | "panel" | Shared glass material. Use card for repeated tiles: the panel rim and fill without backdrop blur. |
| padding | `SurfacePadding \| undefined` | "dialog", "none", "tile", "overlay", "panel" | no | "none" | Semantic padding role. `overlay` is the item-list inset; pair it with `radius="overlay"` so `.fa-item` rows nest. |
| radius | `SurfaceRadius \| undefined` | "dialog", "none", "control", "tile", "surface", "overlay" | no | "surface" | Semantic corner-radius role. |
