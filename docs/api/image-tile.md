# ImageTile

One image in its reserved aspect-ratio box: it never moves anything when it loads.

`import { ImageTile } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/image-tile)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| cover | `boolean \| undefined` | false, true | no | false | Crop to a 16:10 box from the top instead of fitting the image at its own ratio. Defaults to `false`. |
| image | `ResultImage` | See type | yes | — | The image: `src` and `alt`, `width` and `height` in pixels for the reserved ratio, and an optional `caption`. |
| onOpen | `(() => void) \| undefined` | See type | no | — | Called when the image is pressed; supplying it makes the image a button named "Open {alt}". |
