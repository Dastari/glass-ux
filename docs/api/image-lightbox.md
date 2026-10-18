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
| onIndexChange | `(index: number) => void` | See type | yes | — | Called with the zero-based index to show next, from previous / next or ← → (wrapping at the ends). Pair with `index`. |
| onOpenChange | `(open: boolean) => void` | See type | yes | — | Called with `false` when the person dismisses the dialog, for example with Esc. Pair with `open`. |
| open | `boolean` | false, true | yes | — | Controls whether the overlay is open. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
