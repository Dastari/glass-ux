# IpInput

An IPv4 or IPv6 address, optionally with a prefix length. Typed text stays as typed; on blur
it becomes canonical (leading zeros gone, IPv6 compressed per RFC 5952, brackets dropped).

`import { IpInput } from "glass-ux/ip-field"`

[Live examples](https://dastari.github.io/glass-ux/components/ip-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| cidr | `CidrMode \| undefined` | "none", "optional", "required" | no | "none" | A prefix length (/24): "none" (default), "optional" or "required". |
| className | `string \| undefined` | See type | no | — | Layout only (width, grid placement). Applied to the control box. |
| clearable | `boolean \| undefined` | false, true | no | — | Show a clear button while the field has a value. |
| copyable | `boolean \| undefined` | false, true | no | true | A copy button while the value is a valid address (default true). |
| defaultValue | `string \| undefined` | See type | no | "" | The initial value when using the component without controlling its state. |
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
| version | `IpVersion \| "any" \| undefined` | 4, 6, "any" | no | "any" | IPv4, IPv6 or either (default). |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
