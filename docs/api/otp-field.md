# OtpField

OtpInput bound to a string form field. Pair it with `otpSchema()`. With `autoSubmit`, a
complete code submits the form, so the Submit button's pending → ✓ shows the outcome.

`import { OtpField } from "glass-ux/otp-field"`

[Live examples](https://dastari.github.io/glass-ux/components/otp-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| autoSubmit | `boolean \| undefined` | false, true | no | — | Submit the surrounding form when complete (Base UI's autoSubmit). Default false. |
| characters | `OtpCharacters \| undefined` | "numeric", "alphanumeric" | no | — | Digits (default) or letters and digits (recovery codes). |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| groups | `readonly number[] \| undefined` | See type | no | — | Split the boxes into groups with a gap: [3, 3] for six. Default: halves for 6 and 8. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| length | `number \| undefined` | See type | no | — | Number of boxes. Default 6. |
| mask | `boolean \| undefined` | false, true | no | — | Show dots instead of characters (a PIN). Default false. |
| onComplete | `((value: string) => void) \| undefined` | See type | no | — | Called once every box is filled (typed, pasted or autofilled). |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| size | `"md" \| "lg" \| undefined` | "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| status | `OtpStatus \| undefined` | "success", "error" | no | — | error: the code was refused. success: accepted — boxes go green with a ✓, no shift either way. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. Takes precedence over the `disabled` prop on the `<Field.Control>` component. |
