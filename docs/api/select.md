# Select

Pick one option from a short, known list. The trigger is a field box (fa-control) that
shows the chosen option's icon and label; the list opens on glass below it, at least as
wide as the trigger, with a ✓ on the current option. Use Combobox when the list is long
enough to need typing.

`import { Select } from "glass-ux/select"`

[Live examples](https://dastari.github.io/glass-ux/components/select)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| className | `string \| undefined` | See type | no | — | Layout only. Applied to the trigger. |
| defaultValue | `V \| null \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| icon | `ReactNode` | See type | no | — | A fixed leading icon, for options that have none of their own. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| onBlur | `((event: FocusEvent<HTMLButtonElement>) => void) \| undefined` | See type | no | — | Fires when focus leaves the select while it is closed (not when its popup opens). |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with true when the popup opens and false when it closes. |
| onValueChange | `((value: V \| null) => void) \| undefined` | See type | no | — | Called with the chosen option's value when one is picked. Pair with `value` to control it; use `defaultValue` otherwise. |
| options | `SelectOptions<V>` | See type | yes | — | The available choices, including their values and visible labels. |
| placeholder | `string \| undefined` | See type | no | "Choose…" | Shown while nothing is chosen. Name the choice ("Choose an environment"), not "Select…". |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLButtonElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |
| size | `SelectSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| value | `V \| null \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Content width: short (port, PIN), medium (name, hostname), full (default). |
