# ResultImages

Screenshots and remote previews. One image fills the card at its own ratio (capped
height); several form a grid of equal tiles. Every box reserves its aspect ratio, and
a click opens the lightbox.

`import { ResultImages } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-images)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "images"; images: ResultImage[]; }` | See type | yes | — | The images result: one of its `images` fills the card; several form a grid of cropped tiles. |
