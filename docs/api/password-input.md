# PasswordInput

A password box (R20): the reveal toggle is an eye button with a tooltip and aria-pressed;
a Caps Lock warning appears inside the box while it is on; new passwords get a strength bar
and, optionally, Generate and Copy. The value is never logged, stored or sent anywhere but
the form.

`import { PasswordInput } from "glass-ux/password-field"`

[Live examples](https://dastari.github.io/glass-ux/components/password-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Layout only (width, grid placement). Applied to the control box. |
| copyable | `boolean \| undefined` | false, true | no | — | A copy button while there is a value. Default: on when Generate is. |
| defaultValue | `string \| undefined` | See type | no | "" | The initial value when using the component without controlling its state. |
| generate | `boolean \| GenerateOptions \| undefined` | See type | no | false | A Generate button (cryptographically random), with these options. Default off. |
| icon | `ReactNode` | See type | no | — | Leading icon. Pass the icon without a size. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field (inside a Field, set `error` on the Field instead). |
| onClear | `(() => void) \| undefined` | See type | no | — | Called after the clear button or Escape empties the field. |
| onRevealedChange | `((revealed: boolean) => void) \| undefined` | See type | no | — | Called with the new state when the show/hide password button is pressed. Pair with `revealed` to control it. |
| onStrengthChange | `((strength: Strength) => void) \| undefined` | See type | no | — | Called with a fresh estimate whenever the password changes, while strength is measured (`strength`, or a new password). |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called with the password on each keystroke and when Generate fills it. Pair with `value` to control it; use `defaultValue` otherwise. |
| purpose | `PasswordPurpose \| undefined` | "current", "new" | no | "new" | current: signing in or confirming (autocomplete="current-password"). new: setting one (autocomplete="new-password", password managers offer to generate and save). Default "new". |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| revealed | `boolean \| undefined` | false, true | no | — | Password boxes: whether the value shows as text. Leave unset for the box's own toggle. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard hint shown while the field is empty and unfocused ("mod+k" → ⌘K / Ctrl K). |
| size | `InputSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| strength | `boolean \| undefined` | false, true | no | — | The strength bar along the box's lower edge. Default: on for new passwords. |
| trailing | `ReactNode` | See type | no | — | Any other trailing content (a status, a small action). |
| unit | `ReactNode` | See type | no | — | Unit after the value ("GB", "ms", "%"). |
| userInputs | `readonly string[] \| undefined` | See type | no | — | The person's own details, which the strength estimate penalises (name, email, organisation). |
| value | `string \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").InputState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |

Also accepts the element’s standard HTML attributes and React DOM events.
