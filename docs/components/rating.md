# Rating

`glass-ux/rating` · [Live component catalogue](https://dastari.github.io/glass-ux/)

A rating chosen from a row of icons, or shown as one. Stars by default, with a slot for any
other icon.

```tsx
import { Rating, ratingSchema } from "glass-ux/rating"

<Rating aria-label="Service" defaultValue={3} onValueChange={save} />
<Rating readOnly aria-label="Harbour Cafe" value={4.3} />

const schema = z.object({ quality: ratingSchema({ required: true }) })   // "Choose a rating"
<form.AppField name="quality">{(field) => <field.RatingField label="Quality" required />}</form.AppField>
```

- **Value:** `number | null`, from 0 to `max` (default 5); `null` is no rating. `value` and
  `onValueChange` control it, `defaultValue` starts it. `step={0.5}` also allows half icons.
  `name` adds a hidden input for native form submission.
- **Semantics:** a radio group, one radio per choice, each named with its value ("3 of 5
  stars"). A rating is a choice among named options, and "no rating" is a real state that a
  slider, which always holds a value, cannot express. The group is one tab stop, on the chosen
  radio or the first. The group needs a name: `aria-label`, `aria-labelledby`, or a `Field`
  label (found for you inside a `Field`).
- **Keyboard:** as native radios, the arrows move and choose. Right and Down raise the rating
  and Left and Up lower it, and the horizontal pair follows the reading direction. Home and
  End go to the ends, Space chooses the focused radio. With `clearable`, choosing the current
  rating again, Delete and Backspace clear it. There is no visible clear button, so clearing
  by pointer is the second press.
- **Words:** the value text is a message with the total pluralised by the locale's rules and the
  numbers formatted by the locale ("3.5 of 5 stars", "٣٫٥ من ٥ نجوم"). Pass `valueText` for
  another unit, such as hearts.
- **Display:** `readOnly` renders one image named "Rating: 4.3 of 5 stars" (use `aria-label` for
  the subject) and fills to the exact value. It is not a control, so a list of ratings is not a
  list of radio groups.
- **Hover:** the pointer previews the rating by changing colour only, written to the root without
  rendering, so nothing moves (R9.6). Touch has no preview.
- **Right to left:** the fill starts at the reading start and the order of the icons follows it.
- **Targets:** every icon is at least 24 CSS pixels wide, and 44 on coarse pointers. With half
  steps each half is half that wide, so use `size="lg"` for touch.
- **Parts:** `Rating` (the bare control), `RatingField` (bound to a form field), `ratingSchema`.
