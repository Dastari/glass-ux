# DomainInput

A domain ("northstar.example"), lower case; Unicode becomes punycode; a pasted URL gives its host.

`import { DomainInput } from "glass-ux/hostname-field"`

[Live examples](https://dastari.github.io/glass-ux/components/domain-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| case | `"lower" \| "preserve" \| undefined` | "lower", "preserve" | no | — | "lower" (default for domains) or "preserve" (default for host names: "NST-C106"). |
| className | `string \| undefined` | See type | no | — | Layout only (width, grid placement). Applied to the control box. |
| clearable | `boolean \| undefined` | false, true | no | — | Show a clear button while the field has a value. Escape also clears a filled field (and is then not propagated, so an enclosing dialog stays open); the button itself is a pointer affordance outside the tab order. |
| copyable | `boolean \| undefined` | false, true | no | false | A copy button while the value is valid (default false: names are short and visible). |
| defaultValue | `string \| undefined` | See type | no | "" | The initial value when using the component without controlling its state. |
| icon | `ReactNode` | See type | no | — | Leading icon. Pass the icon without a size. |
| identifier | `boolean \| undefined` | false, true | no | — | Identifiers (addresses, hostnames) get tabular figures (R8.4). Default true. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field (inside a Field, set `error` on the Field instead). |
| locale | `string \| undefined` | See type | no | — | Locale for validation wording. Defaults to getLocale(). |
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
| wildcard | `boolean \| undefined` | false, true | no | — | Allow a leading "*." wildcard label ("*.northstar.example"). Default false. |

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
