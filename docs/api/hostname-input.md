# HostnameInput

A host name: one label ("NST-C106") or a dotted name ("printer.northstar.local"). A pasted URL gives its host.

`import { HostnameInput } from "glass-ux/hostname-field"`

[Live examples](https://dastari.github.io/glass-ux/components/hostname-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| case | `"lower" \| "preserve" \| undefined` | "lower", "preserve" | no | — | "lower" (default for domains) or "preserve" (default for host names: "NST-C106"). |
| className | `string \| undefined` | See type | no | — | Layout only (width, grid placement). Applied to the control box. |
| clearable | `boolean \| undefined` | false, true | no | — | Show a clear button while the field has a value. |
| copyable | `boolean \| undefined` | false, true | no | false | A copy button while the value is valid (default false: names are short and visible). |
| defaultValue | `string \| undefined` | See type | no | "" | The initial value when using the component without controlling its state. |
| fqdn | `boolean \| undefined` | false, true | no | — | Require a fully qualified name with a dot ("printer.northstar.local"). Default false. |
| icon | `ReactNode` | false, true | no | — | Leading icon. Pass the icon without a size. |
| identifier | `boolean \| undefined` | false, true | no | — | Identifiers (addresses, hostnames) get tabular figures (R8.4). Default true. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field (inside a Field, set `error` on the Field instead). |
| onClear | `(() => void) \| undefined` | See type | no | — | Called after the clear button empties the field. |
| onRevealedChange | `((revealed: boolean) => void) \| undefined` | See type | no | — | Called when revealed change occurs. The callback type specifies its arguments. |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| revealed | `boolean \| undefined` | false, true | no | — | Password boxes: whether the value shows as text. Leave unset for the box's own toggle. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard hint shown while the field is empty and unfocused ("mod+k" → ⌘K / Ctrl K). |
| size | `InputSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| trailing | `ReactNode` | false, true | no | — | Any other trailing content (a status, a small action). |
| unit | `ReactNode` | false, true | no | — | Unit after the value ("GB", "ms", "%"). |
| value | `string \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |
| wildcard | `boolean \| undefined` | false, true | no | — | Allow a leading "*." wildcard label ("*.northstar.example"). Default false. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
