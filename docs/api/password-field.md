# PasswordField

PasswordInput bound to a string form field. For new passwords the message line says how
strong it is until there is an error. Pair it with `passwordSchema()` (new) or
`currentPasswordSchema()` (sign-in, confirm).

`import { PasswordField } from "glass-ux/password-field"`

[Live examples](https://dastari.github.io/glass-ux/components/password-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| copyable | `boolean \| undefined` | false, true | no | — | A copy button while there is a value. Default: on when Generate is. |
| generate | `boolean \| GenerateOptions \| undefined` | See type | no | — | A Generate button (cryptographically random), with these options. Default off. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| icon | `ReactNode` | See type | no | — | Leading icon. Pass the icon without a size. |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| onClear | `(() => void) \| undefined` | See type | no | — | Called after the clear button empties the field. |
| onRevealedChange | `((revealed: boolean) => void) \| undefined` | See type | no | — | Called when revealed change occurs. The callback type specifies its arguments. |
| onStrengthChange | `((strength: Strength) => void) \| undefined` | See type | no | — | Called when strength change occurs. The callback type specifies its arguments. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| purpose | `PasswordPurpose \| undefined` | "current", "new" | no | — | current: signing in or confirming (autocomplete="current-password"). new: setting one (autocomplete="new-password", password managers offer to generate and save). Default "new". |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| revealed | `boolean \| undefined` | false, true | no | — | Password boxes: whether the value shows as text. Leave unset for the box's own toggle. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard hint shown while the field is empty and unfocused ("mod+k" → ⌘K / Ctrl K). |
| size | `InputSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| strength | `boolean \| undefined` | false, true | no | — | The strength bar along the box's lower edge. Default: on for new passwords. |
| trailing | `ReactNode` | See type | no | — | Any other trailing content (a status, a small action). |
| unit | `ReactNode` | See type | no | — | Unit after the value ("GB", "ms", "%"). |
| userInputs | `readonly string[] \| undefined` | See type | no | — | The person's own details, which the strength estimate penalises (name, email, organisation). |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
