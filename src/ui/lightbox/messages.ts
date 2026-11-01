import { defineMessages } from "../../lib/i18n/catalog.js"

/** Lightbox's words. */
export const lightboxMessages = defineMessages("lightbox", {
  previous: "Previous image",
  next: "Next image",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  fit: "Fit to window",
  fitted: "Fit",
  alreadyFitted: "Already fitted",
  largest: "Largest zoom",
  position: (index: number, total: number) => `${index} of ${total}`,
  /** Announced when the picture changes: "Image 3 of 8: Harbour at dusk". */
  shown: ({ index, total, alt }: { index: number; total: number; alt: string }) => `Image ${index} of ${total}: ${alt}`,
  thumbnails: "Images",
  show: (alt: string) => `Show ${alt}`,
  /** The inline viewer's accessible name. */
  viewer: "Image viewer",
  /** Shows the picture one image pixel to one screen pixel. */
  actualSize: "Actual size",
  /** The short form of actual size, in the zoom readout and on its button. */
  actualShort: "1:1",
  rotateRight: "Rotate right",
  rotateLeft: "Rotate left",
  flipHorizontal: "Flip horizontally",
  flipVertical: "Flip vertically",
  fullScreen: "Full screen",
  exitFullScreen: "Exit full screen",
  startSlideshow: "Start slideshow",
  stopSlideshow: "Stop slideshow",
  /** Announced when a slideshow starts. */
  slideshowStarted: "Slideshow started",
  /** Announced when a slideshow stops without changing the picture. */
  slideshowStopped: "Slideshow stopped",
  /** Announced when moving to another picture stops a slideshow: "Slideshow stopped. Image 3 of 8: Harbour at dusk". */
  slideshowStoppedOn: ({ index, total, alt }: { index: number; total: number; alt: string }) => `Slideshow stopped. Image ${index} of ${total}: ${alt}`,
  /** Toggles the panel of details beside the picture, and names it. */
  details: "Details",
  /** Opens the tools that do not fit on a narrow viewer. */
  moreTools: "More image tools",
  /** Why a tool is unavailable: the picture failed, or the item is not a picture. */
  unavailable: "Not available for this item",
  /** Shown in the stage when a picture fails. */
  loadFailed: "This image didn't load. Check the connection, then retry.",
  /** Announced when the picture on show fails. */
  loadFailedNamed: (alt: string) => `Couldn't load ${alt}`,
  retry: "Retry",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    lightbox: typeof lightboxMessages.defaults
  }
}
