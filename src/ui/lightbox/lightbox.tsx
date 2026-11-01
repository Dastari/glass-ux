import { useControllable } from "../../lib/use-controllable.js"
import { Dialog, type DialogChangeDetails } from "../dialog/index.js"
import type { ImageViewerOptions } from "./types.js"
import { LightboxViewer } from "./viewer.js"

export interface LightboxProps extends ImageViewerOptions {
  /** The picture shown. Pair with `onIndexChange` to control it. */
  index?: number
  /** The first picture shown when uncontrolled. Default 0. */
  defaultIndex?: number
  /** Called with the zero-based index to show, from previous/next, ← →, a swipe, a thumbnail or the slideshow (wrapping at the ends). */
  onIndexChange?: (index: number) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Pictures at full size in a dialog: previous and next (← →, or a swipe on touch), continuous
 * zoom (the wheel about the pointer, a pinch, a double press between fit and actual size, + −
 * through `zoomSteps`, 0 to fit, 1 for actual size) where a zoomed picture pans by dragging,
 * view-only rotate and flip (R and Shift+R), full screen (F), a slideshow, an optional strip
 * of thumbnails, details and actions for the current picture. Each picture starts fitted,
 * upright and unflipped. While a picture is zoomed and the stage has focus, the arrow keys
 * move it instead of changing picture; the Previous and Next buttons and the thumbnails still
 * do. A change of picture is announced politely ("Image 3 of 8: alt"). In full screen Esc
 * leaves full screen first, then closes. `ImageViewer` is the same viewer in the page.
 */
export function Lightbox({
  images,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...options
}: LightboxProps) {
  const [index, setIndex] = useControllable(indexProp, defaultIndex, onIndexChange)
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const image = images[index]
  const change = (next: boolean, details: DialogChangeDetails) => {
    // Where the browser lets a page see Esc in full screen, it does what the browser would.
    if (!next && details.reason === "escape-key" && document.fullscreenElement?.classList.contains("fa-lightbox-viewer")) {
      details.cancel()
      void document.exitFullscreen().catch(() => {})
      return
    }
    setOpen(next)
  }
  return (
    <Dialog.Root open={open && Boolean(image)} onOpenChange={change}>
      <Dialog.Popup size="xl" className="fa-lightbox">
        {image ? <LightboxViewer {...options} frame="dialog" images={images} index={index} onIndexChange={setIndex} /> : null}
      </Dialog.Popup>
    </Dialog.Root>
  )
}
