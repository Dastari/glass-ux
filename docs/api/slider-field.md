# SliderField

A slider with its label, track and current value on one row. The value's width is
reserved from the widest value the slider can show, so dragging never moves the track
(R9.1). The label column is a fixed width, so the tracks of stacked fields line up, and a long
label wraps; set `--slider-field-label-width` to change it. In a container narrower than 22rem the row wraps to the label and value above the
track. Hint, warning and error share Field's reserved message line.

Controlled with `value` and `onValueChange`, or uncontrolled with `defaultValue`. The
label names the slider and the readout is hidden from assistive technology, because the
thumb already announces its value text. Use `Slider` directly for a range.

`import { SliderField } from "glass-ux/slider"`

[Live examples](https://dastari.github.io/glass-ux/components/slider-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| bubble | `"auto" \| "never" \| "always" \| undefined` | "auto", "never", "always" | no | — | auto: the value bubble shows while dragging or keyboard-focused. always: pinned. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| defaultValue | `number \| undefined` | See type | no | — | The starting value when uncontrolled. Default `min`. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| error | `ReactNode` | See type | no | — | Replaces the hint in place. Setting it marks the field and its control invalid. |
| format | `((value: number) => string) \| undefined` | See type | no | — | Formats the bubble and aria-valuetext. Default: the number plus `unit`. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `ReactNode` | See type | yes | — | Names the slider. Shown at the start of the row. |
| largeStep | `number \| undefined` | See type | no | — | The larger keyboard increment. |
| locale | `string \| undefined` | See type | no | — | BCP 47 locale for the default bubble and aria-valuetext number. Default: the nearest `LocaleProvider`, then `configureLocale()`, then `<html lang>`, then en-US. |
| marks | `boolean \| (number \| SliderMark)[] \| undefined` | See type | no | — | Tick marks under the track; `true` puts one on every step (use for ≤ 20 steps). |
| max | `number \| undefined` | See type | no | 100 | Upper value or visible-item limit, as specified by the type. |
| message | `"auto" \| "reserve" \| undefined` | "auto", "reserve" | no | — | reserve: the message line always exists (default for vertical fields), so an error never moves anything (R9.1). auto: only rendered when there is a hint, error or counter. |
| min | `number \| undefined` | See type | no | 0 | Lower allowed value. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when a thumb loses focus, so a form can mark the field touched. |
| onValueChange | `((value: number) => void) \| undefined` | See type | no | — | Called continuously while the thumb is dragged or stepped. |
| onValueCommitted | `((value: number) => void) \| undefined` | See type | no | — | Called once when the user lets go (or after a keyboard step). |
| optional | `boolean \| undefined` | false, true | no | false | Marks the label "Optional". Prefer this over marking required fields. |
| origin | `number \| undefined` | See type | no | — | The value the fill grows from, for a two-way slider such as -100 to 100: the fill runs from the origin to the thumb, on either side, in the reading direction. At the origin there is no fill. One thumb only; a range ignores it. Default: `min`, the fill from the start. |
| required | `boolean \| undefined` | false, true | no | false | Shows the required marker. Pass `required` to the control as well. |
| showValue | `boolean \| undefined` | false, true | no | true | Show the current value at the end of the row. Default true. When false the bubble shows while dragging unless `bubble` says otherwise. |
| size | `ChoiceSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| step | `number \| undefined` | See type | no | 1 | Increment used by keyboard and stepper interaction. |
| tone | `ChoiceTone \| undefined` | "danger", "warning", "success", "accent" | no | — | The range colour. Status tones only when the value is a status threshold (R3.3). |
| unit | `string \| undefined` | See type | no | — | Unit after the number, joined with a thin space ("Mbps", "%"). |
| value | `number \| undefined` | See type | no | — | The value, in the slider's units. Pair with `onValueChange` to control it. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| dirty | `boolean \| undefined` | false, true | no | — | Whether the field's value has been changed from its initial value. Useful when the field state is controlled by an external library. |
| invalid | `boolean \| undefined` | false, true | no | — | Whether the field is invalid. Useful when the field state is controlled by an external library. |
| touched | `boolean \| undefined` | false, true | no | — | Whether the field has been touched. Useful when the field state is controlled by an external library. |
