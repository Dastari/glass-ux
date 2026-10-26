# ImageLightbox

A lightbox for result images: the library's Lightbox (previous / next, swipe, zoom and
pan, thumbnails) fed with the result's images. ← → move between images, + and − zoom,
0 fits.

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
