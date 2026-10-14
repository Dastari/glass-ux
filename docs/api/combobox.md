# Combobox

Choose exactly one item from a long list by typing. Same box as Input, same list as
Select; static options or an async source. Arrow keys move, Enter chooses, Esc closes
then clears.

`import { Combobox } from "glass-ux/combobox"`

[Live examples](https://dastari.github.io/glass-ux/components/combobox)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| className | `string \| undefined` | See type | no | — | Layout only. Applied to the control box. |
| defaultValue | `V \| null \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| empty | `((query: string) => ReactNode) \| undefined` | See type | no | — | Text for the empty row. Default: No matches for “query”. |
| icon | `ReactNode` | false, true | no | — | Leading icon. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Marks the control invalid. Pair it with an accessible validation message. |
| loading | `boolean \| undefined` | false, true | no | false | Skeleton rows while static options load elsewhere. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when blur occurs. The callback type specifies its arguments. |
| onValueChange | `((value: V \| null) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| options | `ComboboxOption<V>[] \| undefined` | See type | no | — | A static list, filtered as you type. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| size | `SelectSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| source | `OptionSource<V> \| undefined` | See type | no | — | Or search a server as you type (debounced, cancellable, cached). |
| value | `V \| null \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
