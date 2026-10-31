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
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    lightbox: typeof lightboxMessages.defaults
  }
}
