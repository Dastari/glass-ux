# DurationInput

A duration typed the way people say it — "1h 30m", "90", "1:30", "1.5 hours", "2 days" — held
as whole seconds and rewritten compactly when focus leaves ("90" → "1h 30m").

`import { DurationInput } from "glass-ux/duration-field"`

[Live examples](https://dastari.github.io/glass-ux/components/duration-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Layout only (width, grid placement). Applied to the control box. |
| clearable | `boolean \| undefined` | false, true | no | — | Show a clear button while the field has a value. |
| defaultUnit | `DurationUnit \| undefined` | "s", "d", "w", "h", "m" | no | "m" | The unit of a bare number ("90" → 90 minutes). Default "m". |
| defaultValue | `number \| null \| undefined` | See type | no | null | The initial value when using the component without controlling its state. |
| icon | `ReactNode` | See type | no | — | Leading icon. Pass the icon without a size. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field (inside a Field, set `error` on the Field instead). |
| onClear | `(() => void) \| undefined` | See type | no | — | Called after the clear button empties the field. |
| onRevealedChange | `((revealed: boolean) => void) \| undefined` | See type | no | — | Called when revealed change occurs. The callback type specifies its arguments. |
| onValueChange | `((seconds: number \| null) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| revealed | `boolean \| undefined` | false, true | no | — | Password boxes: whether the value shows as text. Leave unset for the box's own toggle. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard hint shown while the field is empty and unfocused ("mod+k" → ⌘K / Ctrl K). |
| size | `InputSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| trailing | `ReactNode` | See type | no | — | Any other trailing content (a status, a small action). |
| unit | `ReactNode` | See type | no | — | Unit after the value ("GB", "ms", "%"). |
| units | `readonly DurationUnit[] \| undefined` | See type | no | ["d", "h", "m"] | Units written back, largest first (default d, h, m). Seconds below the smallest round. |
| value | `number \| null \| undefined` | See type | no | — | Seconds; null when empty; NaN while the text cannot be read. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | "short" | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
