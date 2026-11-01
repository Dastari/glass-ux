# Rating

A rating chosen from a row of icons, or shown as one. It is a radio group: the question is
"which one of these?", each choice has a name ("3 of 5 stars"), and no choice is a real state
that a slider, which always has a value, cannot say. The group is one tab stop, on the chosen
icon (or the first). The arrow keys move and choose as native radios do: forward (Right, or
Left in a right-to-left language, and Down) raises the rating, back lowers it. Home and End go
to the ends, Space chooses the focused one, and with `clearable` Delete and Backspace clear it.

`step={0.5}` splits every icon into two choices. Their pointer targets are half an icon wide, so
use `size="lg"` for touch. The fill starts at the reading start, so it mirrors in right-to-left
languages. Moving the pointer over the icons previews the rating by changing colour only; the
layout never moves.

With `readOnly` it is an image named with its value ("Rating: 4.3 of 5 stars") that fills to the
exact value, for averages. Bind it to a form with `field.RatingField`.

`import { Rating } from "glass-ux/rating"`

[Live examples](https://dastari.github.io/glass-ux/components/rating)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-describedby | `string \| undefined` | See type | no | — | Ids of elements that describe the rating, such as a hint. A Field adds its own message. |
| aria-label | `string \| undefined` | See type | no | — | The group's name when no Field or `aria-labelledby` names it. Default "Rating". For a read-only display, the name that precedes the value. |
| aria-labelledby | `string \| undefined` | See type | no | — | Names the group by another element, such as a heading. Takes the place of `aria-label`. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| clearable | `boolean \| undefined` | false, true | no | false | Choosing the current rating again, or pressing Delete or Backspace, clears it. Default false. |
| defaultValue | `number \| null \| undefined` | See type | no | null | The starting rating when uncontrolled. Default `null`. |
| disabled | `boolean \| undefined` | false, true | no | false | Disables interaction while retaining the component’s disabled appearance. |
| icon | `ReactNode` | See type | no | — | The icon, drawn outlined when empty and filled when chosen. Pass it without a size. Default a star. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Show the invalid state (set by RatingField when its error shows). |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| max | `number \| undefined` | See type | no | 5 | How many icons there are, and so the highest rating. Default 5. |
| name | `string \| undefined` | See type | no | — | Name for a native form submission (a hidden input carries the rating, empty for none). |
| onBlur | `((event: FocusEvent<HTMLDivElement>) => void) \| undefined` | See type | no | — | Called when focus leaves the group, for form libraries' touched state. |
| onValueChange | `((value: number \| null) => void) \| undefined` | See type | no | — | Called with the chosen rating, or `null` when it is cleared. |
| readOnly | `boolean \| undefined` | false, true | no | false | Show the rating without a way to change it. It is then a single image with the value as its name, not a group of choices, so it can sit in a list or card. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| size | `"sm" \| "md" \| "lg" \| undefined` | "sm", "md", "lg" | no | "md" | Icon size. Default `md`. |
| step | `1 \| 0.5 \| undefined` | 1, 0.5 | no | 1 | `1` chooses whole icons; `0.5` also chooses half of one. A read-only display ignores it and fills to the exact value. Default 1. |
| value | `number \| null \| undefined` | See type | no | — | The rating, from 0 to `max`; `null` is no rating. Pair with `onValueChange` to control it. |
| valueText | `((value: number, max: number) => string) \| undefined` | See type | no | — | Words for a rating, such as "3 hearts out of 5". Default "3.5 of 5 stars". |
