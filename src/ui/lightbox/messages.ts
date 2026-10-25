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
  thumbnails: "Images",
  show: (alt: string) => `Show ${alt}`,
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    lightbox: typeof lightboxMessages.defaults
  }
}
