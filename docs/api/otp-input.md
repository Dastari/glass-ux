# OtpInput

A one-time code in N boxes (Base UI OTP Field): autocomplete="one-time-code" so phones offer
the code from a message, a numeric keypad, paste fills every box (the code is found inside
"Your code is 482913"), Backspace steps back, the arrows move. Errors and success show on
the boxes themselves; nothing moves.

`import { OtpInput } from "glass-ux/otp-field"`

[Live examples](https://dastari.github.io/glass-ux/components/otp-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| autoSubmit | `boolean \| undefined` | false, true | no | false | Submit the surrounding form when complete (Base UI's autoSubmit). Default false. |
| characters | `OtpCharacters \| undefined` | "numeric", "alphanumeric" | no | "numeric" | Digits (default) or letters and digits (recovery codes). |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| undefined` | See type | no | "" | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| groups | `readonly number[] \| undefined` | See type | no | — | Split the boxes into groups with a gap: [3, 3] for six. Default: halves for 6 and 8. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Marks the control invalid. Pair it with an accessible validation message. |
| length | `number \| undefined` | See type | no | 6 | Number of boxes. Default 6. |
| mask | `boolean \| undefined` | false, true | no | false | Show dots instead of characters (a PIN). Default false. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `(() => void) \| undefined` | See type | no | — | Called when blur occurs. The callback type specifies its arguments. |
| onComplete | `((value: string) => void) \| undefined` | See type | no | — | Called once every box is filled (typed, pasted or autofilled). |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| size | `"md" \| "lg" \| undefined` | "md", "lg" | no | "lg" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| status | `OtpStatus \| undefined` | "success", "error" | no | — | error: the code was refused. success: accepted — boxes go green with a ✓, no shift either way. |
| value | `string \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
