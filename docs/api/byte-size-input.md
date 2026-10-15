# ByteSizeInput

A size typed the way people write it — "500 MB", "1.5 GB", "2 GiB" — held as whole bytes and
rewritten when focus leaves ("1500 MB" → "1.5 GB"). For quotas, thresholds and limits.

`import { ByteSizeInput } from "glass-ux/byte-size-field"`

[Live examples](https://dastari.github.io/glass-ux/components/byte-size-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| base | `ByteBase \| undefined` | "decimal", "binary" | no | "decimal" | How sizes are written back: decimal (default: kB, MB, GB, as disks are sold) or binary (KiB, MiB, GiB, as memory is). |
| className | `string \| undefined` | See type | no | — | Layout only (width, grid placement). Applied to the control box. |
| clearable | `boolean \| undefined` | false, true | no | — | Show a clear button while the field has a value. |
| defaultUnit | `string \| undefined` | See type | no | "MB" | The unit of a bare number ("500" → 500 MB). Default "MB". |
| defaultValue | `number \| null \| undefined` | See type | no | null | The initial value when using the component without controlling its state. |
| icon | `ReactNode` | See type | no | — | Leading icon. Pass the icon without a size. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field (inside a Field, set `error` on the Field instead). |
| onClear | `(() => void) \| undefined` | See type | no | — | Called after the clear button empties the field. |
| onRevealedChange | `((revealed: boolean) => void) \| undefined` | See type | no | — | Called when revealed change occurs. The callback type specifies its arguments. |
| onValueChange | `((bytes: number \| null) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| revealed | `boolean \| undefined` | false, true | no | — | Password boxes: whether the value shows as text. Leave unset for the box's own toggle. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard hint shown while the field is empty and unfocused ("mod+k" → ⌘K / Ctrl K). |
| size | `InputSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| trailing | `ReactNode` | See type | no | — | Any other trailing content (a status, a small action). |
| unit | `ReactNode` | See type | no | — | Unit after the value ("GB", "ms", "%"). |
| value | `number \| null \| undefined` | See type | no | — | Bytes; null when empty; NaN while the text cannot be read. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | "short" | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
