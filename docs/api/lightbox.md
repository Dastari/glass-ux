# Lightbox

Pictures at full size in a dialog: previous and next (← →, or a swipe on touch), zoom
(+ − and 0 to fit) where a zoomed picture pans by dragging or scrolling, an optional strip
of thumbnails and actions for the current picture. Each picture starts fitted.

`import { Lightbox } from "glass-ux/lightbox"`

[Live examples](https://dastari.github.io/glass-ux/components/lightbox)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `((image: LightboxImage, index: number) => ReactNode) \| undefined` | See type | no | — | Actions for the current picture at the end of the footer: download, open the original. |
| defaultIndex | `number \| undefined` | See type | no | 0 |  |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Opens the uncontrolled overlay initially. |
| images | `LightboxImage[]` | See type | yes | — |  |
| index | `number \| undefined` | See type | no | — | The picture shown. Pair with `onIndexChange` to control it. |
| labels | `Partial<{ readonly previous: "Previous image"; readonly next: "Next image"; readonly zoomIn: "Zoom in"; readonly zoomOut: "Zoom out"; readonly fit: "Fit to window"; readonly fitted: "Fit"; readonly alreadyFitted: "Already fitted"; readonly largest: "Largest zoom"; readonly position: (index: number, total: number) => string; readonly thumbnails: "Images"; readonly show: (alt: string) => string; }> \| undefined` | See type | no | — |  |
| locale | `string \| undefined` | See type | no | — |  |
| onIndexChange | `((index: number) => void) \| undefined` | See type | no | — | Called with the zero-based index to show, from previous/next, ← →, a swipe or a thumbnail (wrapping at the ends). |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called when the open state changes, including keyboard dismissal and outside interaction. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| thumbnails | `boolean \| undefined` | false, true | no | true | Show a strip of thumbnails under the picture when there are several. Default true. |
| zoomSteps | `number[] \| undefined` | See type | no | [1.5, 2, 3] | Zoom steps after "fit", as multiples of the fitted width. Default 1.5, 2 and 3. |
