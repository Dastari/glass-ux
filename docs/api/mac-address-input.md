# MacAddressInput

A MAC address in any notation, written one way when focus leaves the field.

`import { MacAddressInput } from "glass-ux/mac-field"`

[Live examples](https://dastari.github.io/glass-ux/components/mac-address-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Layout only (width, grid placement). Applied to the control box. |
| clearable | `boolean \| undefined` | false, true | no | — | Show a clear button while the field has a value. Escape also clears a filled field (and is then not propagated, so an enclosing dialog stays open); the button itself is a pointer affordance outside the tab order. |
| copyable | `boolean \| undefined` | false, true | no | true | A copy button while the value is a valid address (default true). |
| defaultValue | `string \| undefined` | See type | no | "" | The initial value when using the component without controlling its state. |
| format | `MacFormat \| undefined` | "dot", "colon", "hyphen", "bare" | no | "colon" | How the value is written. colon (default) "00:15:65:AA:BB:CC"; hyphen (Windows); dot (Cisco); bare. |
| icon | `ReactNode` | See type | no | — | Leading icon. Pass the icon without a size. |
| identifier | `boolean \| undefined` | false, true | no | — | Identifiers (addresses, hostnames) get tabular figures (R8.4). Default true. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field (inside a Field, set `error` on the Field instead). |
| letterCase | `"lower" \| "upper" \| undefined` | "lower", "upper" | no | "upper" | Upper case (default) or lower. |
| onClear | `(() => void) \| undefined` | See type | no | — | Called after the clear button or Escape empties the field. |
| onRevealedChange | `((revealed: boolean) => void) \| undefined` | See type | no | — | Called with the new state when the show/hide password button is pressed. Pair with `revealed` to control it. |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called with the text as typed on each keystroke, and with its canonical form on blur when that differs. Pair with `value` to control it; use `defaultValue` otherwise. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| revealed | `boolean \| undefined` | false, true | no | — | Password boxes: whether the value shows as text. Leave unset for the box's own toggle. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard hint shown while the field is empty and unfocused ("mod+k" → ⌘K / Ctrl K). |
| size | `InputSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| trailing | `ReactNode` | See type | no | — | Any other trailing content (a status, a small action). |
| unit | `ReactNode` | See type | no | — | Unit after the value ("GB", "ms", "%"). |
| value | `string \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
