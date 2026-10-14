# ResultImages

Screenshots and remote previews. One image fills the card at its own ratio (capped
height); several form a grid of equal tiles. Every box reserves its aspect ratio, and
a click opens the lightbox.

`import { ResultImages } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-images)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "images"; images: ResultImage[]; }` | See type | yes | — | Typed result, including disclosure and rendering metadata. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
