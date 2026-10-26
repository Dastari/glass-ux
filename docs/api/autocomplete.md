# Autocomplete

Free text with suggestions as you type: search boxes, hostnames, paths. Choosing a
suggestion fills the text; anything else may be typed. Suggestions come from a static
list or an async source and use the same rows as Select and Combobox.

`import { Autocomplete } from "glass-ux/autocomplete"`

[Live examples](https://dastari.github.io/glass-ux/components/autocomplete)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| className | `string \| undefined` | See type | no | — | Layout only. Applied to the control box. |
| clearable | `boolean \| undefined` | false, true | no | true | Show the Clear button, which empties the text. Default true. |
| defaultValue | `string \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| empty | `((query: string) => ReactNode) \| undefined` | See type | no | — | Text for the empty row (only while a source has answered). Default: none. |
| fill | `"label" \| "value" \| undefined` | "label", "value" | no | "label" | What choosing a suggestion puts in the field: its label (default) or its value. |
| footer | `ReactNode` | See type | no | — | A quiet line at the foot of the suggestions: a data source's attribution. |
| icon | `ReactNode` | See type | no | — | Leading icon. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Marks the control invalid. Pair it with an accessible validation message. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when the text input loses focus, so a form can mark the field touched. |
| onPick | `((item: OptionItem<V>) => void) \| undefined` | See type | no | — | Called when a suggestion is chosen, with the option. |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called with the raw text on each keystroke, clear, or when a suggestion fills the field (with its label or value, per `fill`). Pair with `value` to control it; use `defaultValue` otherwise. |
| options | `OptionItem<V>[] \| undefined` | See type | no | — | Static suggestions, filtered as you type. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| size | `SelectSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| source | `OptionSource<V> \| undefined` | See type | no | — | Or suggestions searched on a server as you type. |
| value | `string \| undefined` | See type | no | — | The text. Not limited to the suggestions. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short, medium or full (default). |
