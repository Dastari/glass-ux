# Carousel

`glass-ux/carousel` · [Live component catalogue](https://dastari.github.io/glass-ux/)

Slides of any content, one at a time, in a scroll-snap strip with Previous and Next buttons,
indicators and optional automatic advance.

```tsx
import { Carousel } from "glass-ux/carousel"

<Carousel aria-label="Harbour photographs" ratio={16 / 9} slideNames={["Dusk", "Dawn"]} onIndexChange={save}>
  <Image src={dusk} alt="Harbour at dusk" ratio="wide" />
  <Image src={dawn} alt="Harbour at dawn" ratio="wide" />
</Carousel>
```

- **Slides:** each child is a slide (`null` and `false` are skipped). Every slide is rendered, so the
  browser's scroll-snap swipes and snaps with no script per frame; script only learns where the strip
  came to rest. It shows one slide at a time: for a row of cards use a grid.
- **Index:** `index` and `onIndexChange` control the slide, `defaultIndex` starts it. A swipe reports
  once it has come to rest, and Previous, Next, an indicator, a key and autoplay report at once.
  `loop` makes Previous on the first slide go to the last and Next on the last go to the first,
  by scrolling across; without it the buttons stop at the ends and say why (R11.3).
- **Height:** reserved (R9). Every slide takes the tallest slide's height, or `ratio` fixes the strip's shape
  (`16 / 9`) so pictures arriving later move nothing. With `ratio`, a slide's overflow is clipped:
  fit content to the shape.
- **Keyboard and focus:** the indicators are a tab list and one tab stop (R11.5), on the current
  slide. The arrow keys (by reading direction), Home and End move and choose. Slides other than the
  current one are `inert`, so a link or field in a slide that cannot be seen is never reached. The
  strip clips at its edge, so keep controls inside a slide inset by `--focus-reach` (R11.10).
- **Announcements:** a change the person makes is announced politely through `useAnnounce` ("Slide 3
  of 8", with the slide's name from `slideNames`). A change autoplay makes is not announced, and no
  ticking text is in a live region. With no room for the indicators (one 24px target each) the slide
  count ("3 of 8") stands in for them, and the slides become plain groups.
- **Autoplay:** `autoplay={ms}` shows a Pause button (WCAG 2.2.2) and cycles. It holds while the
  pointer is over the carousel, focus is inside it or the document is hidden, and it never starts
  under reduced motion (Appearance's Still or the system setting), where the button is not shown.
  `playing`, `defaultPlaying` and `onPlayingChange` let a host remember the person's choice. Leave at
  least five seconds on each slide.
- **Right to left:** the strip starts at the reading start, the indicators and buttons follow, and
  the chevrons mirror. Scrolling uses the browser's own RTL scroll origin.
- **Narrow containers:** the buttons and count fit in a container down to about 16rem; the strip
  is the container's width and the height follows from it.
- **Words:** every label, the screen-reader terms "carousel" and "slide", and the announcement are
  messages; numbers go through the locale.
