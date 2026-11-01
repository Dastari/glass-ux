import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { getLocale } from "../../lib/locale/locale.js"

const n = (locale: string, value: number) => numberFormat(locale).format(value)

/** English defaults for carousel. */
export const carouselMessages = defineMessages("carousel", {
  /** The carousel's name when the application gives none. */
  label: "Carousel",
  /** What a screen reader calls the carousel and each of its slides ("carousel", "slide"). */
  roleCarousel: "carousel",
  roleSlide: "slide",
  /** A slide's name: its place among the slides, "3 of 8". */
  slide: ({ index, total, locale = "en-US" }: { index: number; total: number; locale?: string }) => `${n(locale, index)} of ${n(locale, total)}`,
  /** Announced when the person moves to a slide; `name` is the slide's own name, when the application gave one. */
  shown: ({ index, total, name, locale = "en-US" }: { index: number; total: number; name?: string; locale?: string }) =>
    name ? `Slide ${n(locale, index)} of ${n(locale, total)}: ${name}` : `Slide ${n(locale, index)} of ${n(locale, total)}`,
  previous: "Previous slide",
  next: "Next slide",
  /** Names the row of indicators. */
  slides: "Slides",
  /** An indicator's name when the application gave the slide none. */
  goTo: ({ index, total, locale = "en-US" }: { index: number; total: number; locale?: string }) => `Go to slide ${n(locale, index)} of ${n(locale, total)}`,
  /** Why Previous is unavailable on the first slide, and Next on the last. */
  firstSlide: "This is the first slide",
  lastSlide: "This is the last slide",
  /** The button that stops automatic advance, and the one that starts it again. */
  pause: "Pause automatic advance",
  play: "Start automatic advance",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    carousel: typeof carouselMessages.defaults
  }
}

/** Resolve carousel wording outside React; pass the component's locale. */
export function getCarouselMessages(locale = getLocale()): typeof carouselMessages.defaults {
  return resolveMessages(carouselMessages.namespace, carouselMessages.defaults, locale)
}
