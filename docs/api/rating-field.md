# RatingField

Rating bound to a `number | null` form field. Pair it with `ratingSchema()`.

`import { RatingField } from "glass-ux/rating"`

[Live examples](https://dastari.github.io/glass-ux/components/rating-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-describedby | `string \| undefined` | See type | no | — | Ids of elements that describe the rating, such as a hint. A Field adds its own message. |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| clearable | `boolean \| undefined` | false, true | no | — | Choosing the current rating again, or pressing Delete or Backspace, clears it. Default false. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| icon | `ReactNode` | See type | no | — | The icon, drawn outlined when empty and filled when chosen. Pass it without a size. Default a star. |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| max | `number \| undefined` | See type | no | — | How many icons there are, and so the highest rating. Default 5. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| size | `"sm" \| "md" \| "lg" \| undefined` | "sm", "md", "lg" | no | — | Icon size. Default `md`. |
| step | `1 \| 0.5 \| undefined` | 1, 0.5 | no | — | `1` chooses whole icons; `0.5` also chooses half of one. A read-only display ignores it and fills to the exact value. Default 1. |
| valueText | `((value: number, max: number) => string) \| undefined` | See type | no | — | Words for a rating, such as "3 hearts out of 5". Default "3.5 of 5 stars". |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. Takes precedence over the `disabled` prop on the `<Field.Control>` component. |
