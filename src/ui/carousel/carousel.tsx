import { Children, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type ReactNode } from "react"
import { IconChevronLeft, IconChevronRight, IconPause, IconPlay } from "../../icons/generated/icons.js"
import { useAnnounce } from "../../hooks/use-announce.js"
import { cx } from "../../lib/cx.js"
import { isRtl, readingKey } from "../../lib/direction.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { observeElementSize } from "../../lib/resize-observer.js"
import { useControllable } from "../../lib/use-controllable.js"
import { useElementSize } from "../../lib/use-element-size.js"
import { prefersReducedMotion } from "../../lib/motion.js"
import { Button } from "../button/index.js"
import { carouselMessages } from "./messages.js"
import { useReducedMotion } from "./use-reduced-motion.js"

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

export interface CarouselProps {
  /** The slides: each child is one slide, of any content. `null` and `false` are skipped. */
  children: ReactNode
  /** The slide shown, from 0. Pair with `onIndexChange` to control it. */
  index?: number
  /** The slide shown first when uncontrolled. Default 0. */
  defaultIndex?: number
  /** Called with the slide moved to, by a button, an indicator, a key, a swipe or autoplay. */
  onIndexChange?: (index: number) => void
  /** Previous on the first slide goes to the last, and Next on the last to the first, by scrolling across. Default false: the buttons stop at the ends. */
  loop?: boolean
  /** The shape every slide has, a width:height number or `"w / h"` string, reserved before anything loads. Without it the tallest slide decides the height, and every slide takes it. */
  ratio?: number | string
  /** Move on by itself after this many milliseconds on each slide, cycling at the end. A Pause button then shows, it holds while the pointer is over the carousel, focus is inside it or the document is hidden, and it never starts under reduced motion. Default off. */
  autoplay?: number
  /** Whether automatic advance is running, when `autoplay` is set. Pair with `onPlayingChange` to control or remember the person's choice. */
  playing?: boolean
  /** Whether automatic advance starts running. Default true. */
  defaultPlaying?: boolean
  /** Called when the person pauses or resumes automatic advance. */
  onPlayingChange?: (playing: boolean) => void
  /** Previous and Next buttons. Default true. */
  arrows?: boolean
  /** `dots` is one indicator per slide, which becomes the slide count when they do not fit; `count` shows only the count; `none` hides both. Default `dots`. */
  indicators?: "dots" | "count" | "none"
  /** Names for the slides, in order, used by the indicators and the announcement of a change: "Harbour at dusk". */
  slideNames?: readonly string[]
  /** Names the carousel. Default "Carousel". */
  "aria-label"?: string
  /** Formatting and wording locale; defaults to the nearest LocaleProvider. */
  locale?: string
  /** Layout only. */
  className?: string
}

const clamp = (value: number, count: number) => Math.min(count - 1, Math.max(0, value))

/**
 * Slides of any content, one at a time, in a scroll-snap strip: a swipe, a trackpad or a wheel
 * moves it with no script per frame, and the browser does the snapping. Previous and Next buttons,
 * one indicator per slide and the keys move it too. The indicators are a tab list and one tab stop;
 * the arrows (by reading direction), Home and End move and choose a slide.
 *
 * Slides other than the current one are `inert`, so a link or field in a slide you cannot see is
 * never reached by Tab. A change the person makes is announced politely ("Slide 3 of 8"); a change
 * `autoplay` makes is not. The height is reserved: the tallest slide decides it, or `ratio` fixes
 * it, so changing slide never moves the page. With `autoplay` a Pause button always shows, and the
 * carousel holds while the pointer is over it, focus is inside it or the document is hidden.
 *
 * The strip clips at its edge: keep controls inside a slide inset by `--focus-reach` so their focus
 * rings show (R11.10). It shows one slide at a time; for a row of cards use a grid.
 *
 * @example
 * <Carousel aria-label="Harbour photographs" ratio={16 / 9}>
 *   <Image src={dusk} alt="Harbour at dusk" ratio="wide" />
 *   <Image src={dawn} alt="Harbour at dawn" ratio="wide" />
 * </Carousel>
 */
export function Carousel({
  children,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  loop = false,
  ratio,
  autoplay,
  playing: playingProp,
  defaultPlaying = true,
  onPlayingChange,
  arrows = true,
  indicators = "dots",
  slideNames,
  "aria-label": ariaLabel,
  locale: localeProp,
  className,
}: CarouselProps) {
  const t = useMessages(carouselMessages, { locale: localeProp })
  const locale = useLocale(localeProp)
  const announce = useAnnounce()
  const slides = Children.toArray(children)
  const count = slides.length
  const [stored, setIndex] = useControllable<number>(indexProp, defaultIndex, onIndexChange)
  const [playingState, setPlaying] = useControllable<boolean>(playingProp, defaultPlaying, onPlayingChange)
  const at = count ? clamp(stored, count) : 0
  const base = useId()
  const reduced = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const slot = useRef<HTMLDivElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const mounted = useRef(false)
  const scroll = useRef<{ target: number | null; since: number; timer: ReturnType<typeof setTimeout> | undefined }>({ target: null, since: 0, timer: undefined })
  // What the timers and listeners read: the latest render's values.
  const live = useRef({ at, count })
  live.current.at = at
  live.current.count = count

  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(() => typeof document !== "undefined" && document.hidden)
  const auto = Boolean(autoplay && autoplay > 0 && count > 1 && !reduced)
  const running = auto && playingState

  const slotWidth = useElementSize(slot).width
  // Indicators are 24px targets side by side; when they do not fit, the count says it instead.
  const dots = indicators === "dots" && count > 1 && slotWidth >= count * 24
  const counter = indicators !== "none" && count > 1 && !dots

  const slideWidth = () => (viewport.current && count ? viewport.current.scrollWidth / count : 0)
  const offsetOf = (position: number) => (viewport.current && isRtl(viewport.current) ? -1 : 1) * position * slideWidth()

  const name = (position: number) => slideNames?.[position]
  const move = (to: number, source: "user" | "auto" = "user") => {
    if (!count) return
    const next = loop ? (to + count) % count : clamp(to, count)
    if (next === live.current.at) return
    if (source === "user") announce(t.shown({ index: next + 1, total: count, name: name(next), locale }), { key: "carousel" })
    setIndex(next)
  }

  // The strip follows the slide: after a button, a key, autoplay or a controlled change it scrolls there. A swipe has
  // already arrived, so nothing happens.
  useIsomorphicLayoutEffect(() => {
    const element = viewport.current
    if (!element || !count) return
    const to = offsetOf(at)
    const first = !mounted.current
    mounted.current = true
    if (!slideWidth() || Math.abs(element.scrollLeft - to) <= 1) return
    scroll.current.target = at
    scroll.current.since = performance.now()
    element.scrollTo?.({ left: to, behavior: first || prefersReducedMotion() ? "auto" : "smooth" })
  }, [at, count])

  // A resize changes every slide's width: put the strip back on the slide shown before the browser's own snap picks another.
  useEffect(() => {
    const element = viewport.current
    if (!element) return
    return observeElementSize(element, () => {
      const to = offsetOf(live.current.at)
      if (slideWidth() && Math.abs(element.scrollLeft - to) > 1) element.scrollTo?.({ left: to, behavior: "auto" })
    })
  }, [])

  // The strip came to rest somewhere: the slide nearest the edge is the one shown. A scroll that code started waits to arrive.
  const settle = () => {
    const state = scroll.current
    state.timer = undefined
    const element = viewport.current
    if (!element || !slideWidth()) return
    if (state.target !== null) {
      const to = offsetOf(state.target)
      state.timer = Math.abs(element.scrollLeft - to) > 1 && performance.now() - state.since < 1500 ? setTimeout(settle, 120) : undefined
      if (state.timer) return
      // The scroll code started did not arrive (a hidden page stalls animations): the slide chosen is still the slide, so put the strip there.
      if (Math.abs(element.scrollLeft - to) > 1) element.scrollTo?.({ left: to, behavior: "auto" })
      state.target = null
      return
    }
    const nearest = clamp(Math.round(Math.abs(element.scrollLeft) / slideWidth()), count)
    if (nearest !== live.current.at) move(nearest, "user")
  }
  // Touching the strip while code scrolls it hands the scroll to the person.
  const stopFollowing = () => {
    scroll.current.target = null
  }
  const onScroll = () => {
    clearTimeout(scroll.current.timer)
    scroll.current.timer = setTimeout(settle, 100)
  }
  useEffect(() => () => clearTimeout(scroll.current.timer), [])

  useEffect(() => {
    const change = () => setHidden(document.hidden)
    document.addEventListener("visibilitychange", change)
    return () => document.removeEventListener("visibilitychange", change)
  }, [])

  const held = hovered || focused || hidden
  useEffect(() => {
    if (!running || held || !autoplay) return
    const timer = setTimeout(() => {
      if (!prefersReducedMotion()) move(live.current.at + 1 >= live.current.count ? 0 : live.current.at + 1, "auto")
    }, autoplay)
    return () => clearTimeout(timer)
  }, [running, held, autoplay, at, count])

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = readingKey(event.key, event.currentTarget)
    const to = key === "ArrowRight" ? at + 1 : key === "ArrowLeft" ? at - 1 : key === "Home" ? 0 : key === "End" ? count - 1 : null
    if (to === null) return
    event.preventDefault()
    const next = loop ? (to + count) % count : clamp(to, count)
    tabs.current[next]?.focus()
    move(next)
  }
  const onViewportKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    const key = readingKey(event.key, event.currentTarget)
    const to = key === "ArrowRight" ? at + 1 : key === "ArrowLeft" ? at - 1 : key === "Home" ? 0 : key === "End" ? count - 1 : null
    if (to === null) return
    event.preventDefault()
    move(to)
  }
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
  }

  const multiple = count > 1
  return (
    <div
      ref={root}
      role="region"
      aria-roledescription={t.roleCarousel}
      aria-label={ariaLabel ?? t.label}
      className={cx("fa-carousel", className)}
      data-playing={running ? "" : undefined}
      data-held={running && held ? "" : undefined}
      style={ratio === undefined ? undefined : ({ "--_ratio": ratio } as CSSProperties)}
      onPointerEnter={(event) => event.pointerType !== "touch" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
    >
      <div
        ref={viewport}
        className="fa-carousel-viewport"
        // A scrolling region is keyboard scrollable (R20.6): focus it and the arrows move the slides.
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        onKeyDown={onViewportKeyDown}
        data-fixed={ratio === undefined ? undefined : ""}
        onScroll={onScroll}
        onPointerDown={stopFollowing}
        onWheel={stopFollowing}
      >
        {slides.map((slide, position) => (
          <div
            key={(slide as { key?: string }).key ?? position}
            id={`${base}-slide-${position}`}
            role={dots ? "tabpanel" : "group"}
            aria-roledescription={t.roleSlide}
            aria-label={t.slide({ index: position + 1, total: count, locale })}
            className="fa-carousel-slide"
            data-current={position === at ? "" : undefined}
            inert={position !== at}
          >
            {slide}
          </div>
        ))}
      </div>
      {arrows || indicators !== "none" || auto ? (
        <div className="fa-carousel-bar">
          {arrows && multiple ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<IconChevronLeft />}
              aria-label={t.previous}
              disabledReason={!loop && at <= 0 ? t.firstSlide : undefined}
              onClick={() => move(at - 1)}
            />
          ) : null}
          <div ref={slot} className="fa-carousel-slot">
            {dots ? (
              // oxlint-disable-next-line jsx-a11y/interactive-supports-focus -- the tabs inside carry the focus; the list takes the keys they bubble
              <div role="tablist" aria-label={t.slides} className="fa-carousel-dots" onKeyDown={onTabKeyDown}>
                {slides.map((_, position) => (
                  <button
                    key={position}
                    ref={(element) => {
                      tabs.current[position] = element
                    }}
                    type="button"
                    role="tab"
                    className="fa-carousel-dot"
                    aria-selected={position === at}
                    aria-controls={`${base}-slide-${position}`}
                    aria-label={name(position) ?? t.goTo({ index: position + 1, total: count, locale })}
                    tabIndex={position === at ? 0 : -1}
                    onClick={() => move(position)}
                  />
                ))}
              </div>
            ) : null}
            {counter ? (
              <span className="fa-carousel-count" data-numeric>
                {t.slide({ index: at + 1, total: count, locale })}
              </span>
            ) : null}
          </div>
          {arrows && multiple ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<IconChevronRight />}
              aria-label={t.next}
              disabledReason={!loop && at >= count - 1 ? t.lastSlide : undefined}
              onClick={() => move(at + 1)}
            />
          ) : null}
          {auto ? (
            <Button
              variant="ghost"
              size="sm"
              icon={playingState ? <IconPause /> : <IconPlay />}
              aria-label={playingState ? t.pause : t.play}
              onClick={() => setPlaying(!playingState)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
