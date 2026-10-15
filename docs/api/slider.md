# Slider

A value (or a range) on a track. The tone range glows in a recessed glass well; the
thumbs are glass beads. A glass value bubble appears while dragging or keyboard-focused.
Arrow keys step, Shift/Page keys take large steps, Home/End jump to the ends.

`import { Slider } from "glass-ux/slider"`

[Live examples](https://dastari.github.io/glass-ux/components/slider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| bubble | `"auto" \| "always" \| "never" \| undefined` | "auto", "always", "never" | no | "auto" | auto: the value bubble shows while dragging or keyboard-focused. always: pinned. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| defaultValue | `number \| number[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| format | `((value: number) => string) \| undefined` | See type | no | — | Formats the bubble and aria-valuetext. Default: the number plus `unit`. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| largeStep | `number \| undefined` | See type | no | — | The larger keyboard increment. |
| marks | `boolean \| (number \| SliderMark)[] \| undefined` | See type | no | — | Tick marks under the track; `true` puts one on every step (use for ≤ 20 steps). |
| max | `number \| undefined` | See type | no | 100 | Upper value or visible-item limit, as specified by the type. |
| min | `number \| undefined` | See type | no | 0 | Lower allowed value. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when blur occurs. The callback type specifies its arguments. |
| onValueChange | `((value: number \| number[]) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| onValueCommitted | `((value: number \| number[]) => void) \| undefined` | See type | no | — | Fires once when the user lets go (or after a keyboard step). |
| size | `ChoiceSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| step | `number \| undefined` | See type | no | 1 | Increment used by keyboard and stepper interaction. |
| thumbLabels | `string[] \| undefined` | See type | no | — | Names each thumb of a range ("Minimum", "Maximum"). |
| tone | `ChoiceTone \| undefined` | "danger", "warning", "success", "accent" | no | — | The range colour. Status tones only when the value is a status threshold (R3.3). |
| unit | `string \| undefined` | See type | no | — | Unit after the number, joined with a thin space ("Mbps", "%"). |
| value | `number \| number[] \| undefined` | See type | no | — | A number for one thumb, a pair for a range. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
