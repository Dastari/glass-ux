# Lightbox

Pictures at full size in a dialog: previous and next (← →, or a swipe on touch), zoom
(+ − and 0 to fit) where a zoomed picture pans by dragging or scrolling, an optional strip
of thumbnails and actions for the current picture. Each picture starts fitted. While a
picture is zoomed and the stage has focus, the arrow keys scroll it instead of changing
picture; the Previous and Next buttons and the thumbnails still do. A change of picture is
announced politely ("Image 3 of 8: alt").

`import { Lightbox } from "glass-ux/lightbox"`

[Live examples](https://dastari.github.io/glass-ux/components/lightbox)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `((image: LightboxImage, index: number) => ReactNode) \| undefined` | See type | no | — | Actions for the current picture at the end of the footer: download, open the original. |
| defaultIndex | `number \| undefined` | See type | no | 0 | The first picture shown when uncontrolled. Default 0. |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Opens the uncontrolled overlay initially. |
| images | `LightboxImage[]` | See type | yes | — | The pictures, in order. |
| index | `number \| undefined` | See type | no | — | The picture shown. Pair with `onIndexChange` to control it. |
| labels | `Partial<{ previous: string; next: string; zoomIn: string; zoomOut: string; fit: string; fitted: string; alreadyFitted: string; largest: string; position: (index: number, total: number) => string; shown: ({ index, total, alt }: { index: number; total: number; alt: string; }) => string; thumbnails: string; show: (alt: string) => string; }> \| undefined` | See type | no | — | Wording overrides. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| onIndexChange | `((index: number) => void) \| undefined` | See type | no | — | Called with the zero-based index to show, from previous/next, ← →, a swipe or a thumbnail (wrapping at the ends). |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called when the open state changes, including keyboard dismissal and outside interaction. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| thumbnails | `boolean \| undefined` | false, true | no | true | Show a strip of thumbnails under the picture when there are several. Default true. |
| zoomSteps | `number[] \| undefined` | See type | no | [1.5, 2, 3] | Zoom steps after "fit", as multiples of the fitted width. Default 1.5, 2 and 3. |
