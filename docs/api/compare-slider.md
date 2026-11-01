# CompareSlider

Two pieces of content over each other with a divider between them: a before and after of an
image, a chart, a page. Drag the divider, press anywhere to move it there, or focus it and use
the arrow keys (Shift, Page Up and Page Down for ten percent, Home and End for the ends).
`before` starts at the reading start, so the sides change places in right-to-left languages and
the arrows still move the divider the way they point. The two contents are laid over each
other, and the taller decides the height. Controls inside them keep working.

`import { CompareSlider } from "glass-ux/compare-slider"`

[Live examples](https://dastari.github.io/glass-ux/components/compare-slider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| after | `ReactNode` | See type | yes | — | Shown from the divider to the reading end (or the bottom). Keep it the same size as `before`. |
| afterLabel | `ReactNode` | See type | no | — | A short name over the `after` side. |
| aria-label | `string \| undefined` | See type | no | — | The divider's accessible name. Default "Comparison position". |
| before | `ReactNode` | See type | yes | — | Shown from the reading start (or the top) up to the divider. Any content: an image, a chart, text. |
| beforeLabel | `ReactNode` | See type | no | — | A short name over the `before` side: "Before", "2024". |
| className | `string \| undefined` | See type | no | — | Layout only. |
| defaultValue | `number \| undefined` | See type | no | 50 | The starting position when uncontrolled. Default 50. |
| disabled | `boolean \| undefined` | false, true | no | false | Disables interaction while retaining the component’s disabled appearance. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| onValueChange | `((value: number) => void) \| undefined` | See type | no | — | Called with the percentage when a drag is released, on a press and on each key. A drag writes the position directly until then. |
| orientation | `"horizontal" \| "vertical" \| undefined` | "horizontal", "vertical" | no | "horizontal" | Which way the divider travels. Default `horizontal`. |
| step | `number \| undefined` | See type | no | 1 | Percent per arrow key. Default 1; Shift, Page Up and Page Down take ten. |
| value | `number \| undefined` | See type | no | — | How much of `before` shows, from 0 to 100 percent. Pair with `onValueChange` to control it. |
