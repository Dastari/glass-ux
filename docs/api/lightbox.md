# Lightbox

Pictures at full size in a dialog: previous and next (← →, or a swipe on touch), continuous
zoom (the wheel about the pointer, a pinch, a double press between fit and actual size, + −
through `zoomSteps`, 0 to fit, 1 for actual size) where a zoomed picture pans by dragging,
view-only rotate and flip (R and Shift+R), full screen (F), a slideshow, an optional strip
of thumbnails, details and actions for the current picture. Each picture starts fitted,
upright and unflipped. While a picture is zoomed and the stage has focus, the arrow keys
move it instead of changing picture; the Previous and Next buttons and the thumbnails still
do. A change of picture is announced politely ("Image 3 of 8: alt"). In full screen Esc
leaves full screen first, then closes. `ImageViewer` is the same viewer in the page.

`import { Lightbox } from "glass-ux/lightbox"`

[Live examples](https://dastari.github.io/glass-ux/components/lightbox)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `((image: LightboxImage, index: number) => ReactNode) \| undefined` | See type | no | — | Actions for the current picture at the end of the footer: download, open the original. |
| autoHideChrome | `boolean \| undefined` | false, true | no | — | Fades the title, thumbnails and toolbar after a moment without input while in full screen. Any input brings them back; nothing moves. Default true. |
| defaultIndex | `number \| undefined` | See type | no | 0 | The first picture shown when uncontrolled. Default 0. |
| defaultInfoOpen | `boolean \| undefined` | false, true | no | — | Whether the details panel starts open when uncontrolled. Default false. |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Opens the uncontrolled overlay initially. |
| images | `LightboxImage[]` | See type | yes | — | The pictures, in order. |
| index | `number \| undefined` | See type | no | — | The picture shown. Pair with `onIndexChange` to control it. |
| infoOpen | `boolean \| undefined` | false, true | no | — | Whether the details panel is open. Pair with `onInfoOpenChange` to control it. |
| labels | `Partial<{ previous: string; next: string; zoomIn: string; zoomOut: string; fit: string; fitted: string; alreadyFitted: string; largest: string; position: (index: number, total: number) => string; shown: ({ index, total, alt }: { index: number; total: number; alt: string; }) => string; thumbnails: string; show: (alt: string) => string; viewer: string; actualSize: string; actualShort: string; rotateRight: string; rotateLeft: string; flipHorizontal: string; flipVertical: string; fullScreen: string; exitFullScreen: string; startSlideshow: string; stopSlideshow: string; slideshowStarted: string; slideshowStopped: string; slideshowStoppedOn: ({ index, total, alt }: { index: number; total: number; alt: string; }) => string; details: string; moreTools: string; unavailable: string; loadFailed: string; loadFailedNamed: (alt: string) => string; retry: string; }> \| undefined` | See type | no | — | Wording overrides. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| maxZoom | `number \| undefined` | See type | no | — | The largest scale, as a multiple of actual size: no gesture, key or step goes past it. Default 4. |
| onIndexChange | `((index: number) => void) \| undefined` | See type | no | — | Called with the zero-based index to show, from previous/next, ← →, a swipe, a thumbnail or the slideshow (wrapping at the ends). |
| onInfoOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the next state when the Details button toggles the panel. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called when the open state changes, including keyboard dismissal and outside interaction. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| renderInfo | `((image: LightboxImage, index: number) => ReactNode) \| undefined` | See type | no | — | Details for the current picture: a description, metadata. Supplying it adds a Details button; the panel sits beside the stage, or under it in a narrow box. |
| slideshowInterval | `number \| undefined` | See type | no | — | Milliseconds each picture stays up in a slideshow, counted once it has loaded. Default 5000. |
| thumbnails | `boolean \| undefined` | false, true | no | — | Show a strip of thumbnails under the picture when there are several. Default true. |
| tools | `readonly LightboxTool[] \| undefined` | See type | no | — | The tool groups to show. Default all of them; full screen also needs a browser that has it. |
| zoomSteps | `number[] \| undefined` | See type | no | — | Zoom steps after "fit", as multiples of the fitted width. + and − stop at each, at actual size and at `maxZoom`. Default 1.5, 2 and 3. |
