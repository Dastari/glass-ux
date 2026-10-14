# ImageLightbox

A lightbox for result images: a dialog with the image on the canvas, previous / next,
and zoom (fit, 150 %, 200 %, 300 %); the zoomed image scrolls inside the stage.
← → move between images, + and − zoom, 0 fits.

`import { ImageLightbox } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/image-lightbox)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| images | `ResultImage[]` | See type | yes | — | Images rendered in display order. |
| index | `number` | See type | yes | — | Index of the current item. |
| onIndexChange | `(index: number) => void` | See type | yes | — | Called when index change occurs. The callback type specifies its arguments. |
| onOpenChange | `(open: boolean) => void` | See type | yes | — | Called when open change occurs. The callback type specifies its arguments. |
| open | `boolean` | false, true | yes | — | Controls whether the overlay is open. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
