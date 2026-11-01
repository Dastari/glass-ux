# ImageViewer

The Lightbox's viewer in the page instead of a dialog: the same pictures, zoom and pan,
rotate and flip, full screen, slideshow, thumbnails, details and actions. Its keys work
while focus is inside it. It fills a parent of definite height, and holds the Lightbox's
stage height in one that has none.

`import { ImageViewer } from "glass-ux/lightbox"`

[Live examples](https://dastari.github.io/glass-ux/components/image-viewer)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `((image: LightboxImage, index: number) => ReactNode) \| undefined` | See type | no | — | Actions for the current picture at the end of the footer: download, open the original. |
| aria-label | `string \| undefined` | See type | no | — | The viewer's accessible name. Default "Image viewer". |
| autoHideChrome | `boolean \| undefined` | false, true | no | — | Fades the title, thumbnails and toolbar after a moment without input while in full screen. Any input brings them back; nothing moves. Default true. |
| className | `string \| undefined` | See type | no | — | Classes for the viewer's root, for layout. |
| defaultIndex | `number \| undefined` | See type | no | 0 | The first picture shown when uncontrolled. Default 0. |
| defaultInfoOpen | `boolean \| undefined` | false, true | no | — | Whether the details panel starts open when uncontrolled. Default false. |
| images | `LightboxImage[]` | See type | yes | — | The pictures, in order. |
| index | `number \| undefined` | See type | no | — | The picture shown. Pair with `onIndexChange` to control it. |
| infoOpen | `boolean \| undefined` | false, true | no | — | Whether the details panel is open. Pair with `onInfoOpenChange` to control it. |
| labels | `Partial<{ previous: string; next: string; zoomIn: string; zoomOut: string; fit: string; fitted: string; alreadyFitted: string; largest: string; position: (index: number, total: number) => string; shown: ({ index, total, alt }: { index: number; total: number; alt: string; }) => string; thumbnails: string; show: (alt: string) => string; viewer: string; actualSize: string; actualShort: string; rotateRight: string; rotateLeft: string; flipHorizontal: string; flipVertical: string; fullScreen: string; exitFullScreen: string; startSlideshow: string; stopSlideshow: string; slideshowStarted: string; slideshowStopped: string; slideshowStoppedOn: ({ index, total, alt }: { index: number; total: number; alt: string; }) => string; details: string; moreTools: string; unavailable: string; loadFailed: string; loadFailedNamed: (alt: string) => string; retry: string; }> \| undefined` | See type | no | — | Wording overrides. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| maxZoom | `number \| undefined` | See type | no | — | The largest scale, as a multiple of actual size: no gesture, key or step goes past it. Default 4. |
| onIndexChange | `((index: number) => void) \| undefined` | See type | no | — | Called with the zero-based index to show, from previous/next, ← →, a swipe, a thumbnail or the slideshow (wrapping at the ends). |
| onInfoOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the next state when the Details button toggles the panel. |
| renderInfo | `((image: LightboxImage, index: number) => ReactNode) \| undefined` | See type | no | — | Details for the current picture: a description, metadata. Supplying it adds a Details button; the panel sits beside the stage, or under it in a narrow box. |
| slideshowInterval | `number \| undefined` | See type | no | — | Milliseconds each picture stays up in a slideshow, counted once it has loaded. Default 5000. |
| thumbnails | `boolean \| undefined` | false, true | no | — | Show a strip of thumbnails under the picture when there are several. Default true. |
| tools | `readonly LightboxTool[] \| undefined` | See type | no | — | The tool groups to show. Default all of them; full screen also needs a browser that has it. |
| zoomSteps | `number[] \| undefined` | See type | no | — | Zoom steps after "fit", as multiples of the fitted width. + and − stop at each, at actual size and at `maxZoom`. Default 1.5, 2 and 3. |
