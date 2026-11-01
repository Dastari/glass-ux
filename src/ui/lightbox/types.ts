import type { ReactNode } from "react"
import type { lightboxMessages } from "./messages.js"

/** One picture in a lightbox. */
export interface LightboxImage {
  /** A stable key; defaults to `src`. */
  id?: string
  /** The picture. With `content`, the still its thumbnail falls back to. */
  src: string
  /** What the picture shows: the stage's name and the title when there is no caption. */
  alt: string
  /** Pixel size, shown in the subtitle and used to reserve the picture's shape. Without both, the shape is read when the picture loads. */
  width?: number
  height?: number
  /** The title above the picture. */
  caption?: ReactNode
  /** A smaller image for the thumbnail strip; defaults to `src`. */
  thumbnail?: string
  /** A low-resolution copy shown while the picture loads. */
  placeholder?: string
  /** The source is not ready yet: holds the picture's shape with `placeholder` or a skeleton. */
  pending?: boolean
  /**
   * Show this in the stage instead of the picture: a video player, a document preview. It takes
   * its own pointer and keys, so zoom, pan, rotate and flip are unavailable for the item and a
   * press in it does not swipe. A slideshow stops when it reaches one.
   */
  content?: ReactNode
}

/** A group of controls the viewer can show: `zoom` is always shown. */
export type LightboxTool = "rotate" | "flip" | "fullscreen" | "slideshow"

/** What the Lightbox and the inline ImageViewer share. */
export interface ImageViewerOptions {
  /** The pictures, in order. */
  images: LightboxImage[]
  /** Show a strip of thumbnails under the picture when there are several. Default true. */
  thumbnails?: boolean
  /** Actions for the current picture at the end of the footer: download, open the original. */
  actions?: (image: LightboxImage, index: number) => ReactNode
  /** Zoom steps after "fit", as multiples of the fitted width. + and − stop at each, at actual size and at `maxZoom`. Default 1.5, 2 and 3. */
  zoomSteps?: number[]
  /** The largest scale, as a multiple of actual size: no gesture, key or step goes past it. Default 4. */
  maxZoom?: number
  /** The tool groups to show. Default all of them; full screen also needs a browser that has it. */
  tools?: readonly LightboxTool[]
  /** Milliseconds each picture stays up in a slideshow, counted once it has loaded. Default 5000. */
  slideshowInterval?: number
  /** Fades the title, thumbnails and toolbar after a moment without input while in full screen. Any input brings them back; nothing moves. Default true. */
  autoHideChrome?: boolean
  /** Details for the current picture: a description, metadata. Supplying it adds a Details button; the panel sits beside the stage, or under it in a narrow box. */
  renderInfo?: (image: LightboxImage, index: number) => ReactNode
  /** Whether the details panel is open. Pair with `onInfoOpenChange` to control it. */
  infoOpen?: boolean
  /** Whether the details panel starts open when uncontrolled. Default false. */
  defaultInfoOpen?: boolean
  /** Called with the next state when the Details button toggles the panel. */
  onInfoOpenChange?: (open: boolean) => void
  /** Formatting and wording locale; defaults to the nearest LocaleProvider. */
  locale?: string
  /** Wording overrides. */
  labels?: Partial<typeof lightboxMessages.defaults>
}
