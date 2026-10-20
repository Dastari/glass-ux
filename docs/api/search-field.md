# SearchField

Search box: magnifier, clear button while filled, Esc clears, optional ⌘K hint for the
top bar. Filtering lists, tables and the command palette all use this one field.

`import { SearchField } from "glass-ux/input"`

[Live examples](https://dastari.github.io/glass-ux/components/search-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when no visible label is present. |
| className | `string \| undefined` | See type | no | — | Layout only (width, grid placement). Applied to the control box. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field (inside a Field, set `error` on the Field instead). |
| onClear | `(() => void) \| undefined` | See type | no | — | Called after the clear button or Escape empties the field. |
| onRevealedChange | `((revealed: boolean) => void) \| undefined` | See type | no | — | Called with the new state when the show/hide password button is pressed. Pair with `revealed` to control it. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| revealed | `boolean \| undefined` | false, true | no | — | Password boxes: whether the value shows as text. Leave unset for the box's own toggle. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard hint shown while the field is empty and unfocused ("mod+k" → ⌘K / Ctrl K). |
| size | `InputSize \| undefined` | "sm", "md", "lg" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| trailing | `ReactNode` | See type | no | — | Any other trailing content (a status, a small action). |
| unit | `ReactNode` | See type | no | — | Unit after the value ("GB", "ms", "%"). |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The default value of the input. Use when uncontrolled. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onValueChange | `((value: string, eventDetails: Input.ChangeEventDetails) => void) \| undefined` | See type | no | — | Callback fired when the `value` changes. Use when controlled. |
| placeholder | `string \| undefined` | See type | no | "Search" | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| style | `React.CSSProperties \| ((state: import("@base-ui/react").InputState) => React.CSSProperties \| undefined) \| undefined` | See type | no | — | Style applied to the element, or a function that returns a style object based on the component's state. |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The value of the input. Use when controlled. |

Also accepts the element’s standard HTML attributes and React DOM events.
