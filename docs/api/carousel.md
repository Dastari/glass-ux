# Carousel

Slides of any content, one at a time, in a scroll-snap strip: a swipe, a trackpad or a wheel
moves it with no script per frame, and the browser does the snapping. Previous and Next buttons,
one indicator per slide and the keys move it too. The indicators are a tab list and one tab stop;
the arrows (by reading direction), Home and End move and choose a slide.

Slides other than the current one are `inert`, so a link or field in a slide you cannot see is
never reached by Tab. A change the person makes is announced politely ("Slide 3 of 8"); a change
`autoplay` makes is not. The height is reserved: the tallest slide decides it, or `ratio` fixes
it, so changing slide never moves the page. With `autoplay` a Pause button always shows, and the
carousel holds while the pointer is over it, focus is inside it or the document is hidden.

The strip clips at its edge: keep controls inside a slide inset by `--focus-reach` so their focus
rings show (R11.10). It shows one slide at a time; for a row of cards use a grid.

`import { Carousel } from "glass-ux/carousel"`

[Live examples](https://dastari.github.io/glass-ux/components/carousel)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Names the carousel. Default "Carousel". |
| arrows | `boolean \| undefined` | false, true | no | true | Previous and Next buttons. Default true. |
| autoplay | `number \| undefined` | See type | no | — | Move on by itself after this many milliseconds on each slide, cycling at the end. A Pause button then shows, it holds while the pointer is over the carousel, focus is inside it or the document is hidden, and it never starts under reduced motion. Default off. |
| children | `ReactNode` | See type | yes | — | The slides: each child is one slide, of any content. `null` and `false` are skipped. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| defaultIndex | `number \| undefined` | See type | no | 0 | The slide shown first when uncontrolled. Default 0. |
| defaultPlaying | `boolean \| undefined` | false, true | no | true | Whether automatic advance starts running. Default true. |
| index | `number \| undefined` | See type | no | — | The slide shown, from 0. Pair with `onIndexChange` to control it. |
| indicators | `"none" \| "dots" \| "count" \| undefined` | "none", "dots", "count" | no | "dots" | `dots` is one indicator per slide, which becomes the slide count when they do not fit; `count` shows only the count; `none` hides both. Default `dots`. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| loop | `boolean \| undefined` | false, true | no | false | Previous on the first slide goes to the last, and Next on the last to the first, by scrolling across. Default false: the buttons stop at the ends. |
| onIndexChange | `((index: number) => void) \| undefined` | See type | no | — | Called with the slide moved to, by a button, an indicator, a key, a swipe or autoplay. |
| onPlayingChange | `((playing: boolean) => void) \| undefined` | See type | no | — | Called when the person pauses or resumes automatic advance. |
| playing | `boolean \| undefined` | false, true | no | — | Whether automatic advance is running, when `autoplay` is set. Pair with `onPlayingChange` to control or remember the person's choice. |
| ratio | `string \| number \| undefined` | See type | no | — | The shape every slide has, a width:height number or `"w / h"` string, reserved before anything loads. Without it the tallest slide decides the height, and every slide takes it. |
| slideNames | `readonly string[] \| undefined` | See type | no | — | Names for the slides, in order, used by the indicators and the announcement of a change: "Harbour at dusk". |
