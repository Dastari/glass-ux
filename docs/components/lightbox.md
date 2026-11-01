# Lightbox and ImageViewer

`glass-ux/lightbox` · [Live component catalogue](https://dastari.github.io/glass-ux/components/lightbox)

`Lightbox` shows pictures at full size in a dialog. `ImageViewer` is the same viewer in the page:
same props, without `open`, `defaultOpen` and `onOpenChange`.

```tsx
import { Lightbox, type LightboxImage } from "glass-ux/lightbox"

const photos: LightboxImage[] = [
  { id: "harbour", src: "/harbour.jpg", alt: "Harbour at dusk", width: 4032, height: 3024, thumbnail: "/harbour-160.jpg" },
]

<Lightbox images={photos} index={index} onIndexChange={setIndex} open={open} onOpenChange={setOpen} />
```

Give pictures `width` and `height`. They reserve the shape and state the size; without them the
shape is held at 3:2 until the picture has loaded, so a fitted picture can change size once.

## Zoom and pan

The picture is laid out at its pixel size and moved with one transform, so `k = 1` is one image
pixel to one CSS pixel and nothing re-renders during a gesture (R14.5, R18.5). The readout and
state change once, when the gesture settles.

- **Fit** never scales a picture above actual size.
- **Wheel and pinch** zoom about the pointer or the fingers, from fit up to `maxZoom` (default 4,
  as a multiple of actual size).
- **Double press or double tap** toggles fit and actual size at that point. A picture that already
  fits at actual size goes to the next stop.
- **+ and −** stop at each of `zoomSteps` (multiples of fit), then actual size, then `maxZoom`.
- **The readout** shows `Fit`, `1:1`, or a percentage of the fitted size, which is what `zoomSteps`
  count in.
- **Pan** by dragging. A press that does not travel stays a click, and the picture stops at its
  edges. A fitted picture has nothing to pan, so a horizontal drag or swipe changes picture.

The stage still scrolls: `scrollLeft` and `scrollTop` report the camera once a gesture settles, and
a host's own scroll does not move the picture.

## Keys

| Key | Action |
| --- | --- |
| ← → | Previous and next, in reading order. While a picture wider than the stage is zoomed and the stage has focus, they move it, as ↑ ↓ always do while zoomed. Shift takes three steps. |
| + − | Zoom in and out by stops |
| 0 | Fit |
| 1 | Actual size |
| R, Shift+R | Rotate right and left |
| F | Full screen |
| Home, End | From a thumbnail: the first and last picture |
| Esc | Leave full screen, then close |

In a Lightbox the keys work anywhere in the dialog. In an ImageViewer they work while focus is
inside it. Keys pressed in a field, a menu, a nested dialog or an item's `content` stay there. R, F
and 1 follow `configureShortcuts`.

## View tools

`tools` lists the groups to show, by default `rotate`, `flip`, `fullscreen` and `slideshow`. Zoom is
always there. In a box narrower than 44rem the fit, rotate, flip, slideshow, full-screen and details
controls move into a ⋯ menu.

- **Rotate and flip** change the view, never the pixels. Each picture starts upright, and fit
  counts the turn. Flips follow the screen's axes.
- **Full screen** is on the viewer, and its popups follow `popupContainer`. Where the browser has no
  element full screen, such as iPhone, the control is hidden (`fullscreenSupported`). After three
  seconds without input the title, thumbnails and toolbar fade, unless `autoHideChrome` is false.
  The stage already fills the screen under them, so nothing moves.
- **Slideshow** holds each picture for `slideshowInterval` milliseconds (default 5000), counted once
  it has loaded. Any press, key, wheel or tool stops it, and it holds while the document is hidden.
  Only the start and the stop are announced. Under Still nothing fades. It stops at an item with
  its own `content`.

## Loading and failure

The stage's height is fixed, so nothing moves while a picture arrives. A skeleton, or `placeholder`
if there is one, holds the picture's shape. `pending` holds it until a source is ready. A failed
picture keeps its shape, offers Retry and is announced; the view tools then say why they are
unavailable. The neighbours of the picture on show load ahead.

## Slots

- **`renderInfo`** adds a Details button and a panel for the current picture: a description or
  metadata, as your own node. It sits beside the stage, or under it in a box narrower than 44rem.
  `infoOpen`, `defaultInfoOpen` and `onInfoOpenChange` control it.
- **An item's `content`** replaces the picture in the stage: a video player, a document preview. It
  keeps its own pointer and keys, and `src` still supplies the thumbnail.
- **`actions`** puts controls for the current picture at the end of the footer.

## Thumbnails

The strip is one tab stop, the current picture, and the arrow keys change picture from it with
focus following. Only thumbnails near the strip's view load. Every thumbnail stays in the document,
so a set in the thousands should page rather than pass them all.

## In results

`ImageLightbox` and `ResultImages` in `glass-ux/ai/results` load the viewer the first time an image
is opened, so a message that only shows images does not pay for it.
