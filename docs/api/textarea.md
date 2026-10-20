# Textarea

Multi-line text. Grows between `minRows` and `maxRows` as you type (field-sizing with a
measured fallback), then scrolls inside itself. Pair with Field's `counter` for limits.

`import { Textarea } from "glass-ux/textarea"`

[Live examples](https://dastari.github.io/glass-ux/components/textarea)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Layout only. Applied to the control box. |
| defaultValue | `string \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| maxRows | `number \| undefined` | See type | no | 8 | Grows with its content up to this many rows, then scrolls. |
| minRows | `number \| undefined` | See type | no | 3 | Rows shown when empty. One row is exactly one control height. |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called with the text on each keystroke. Pair with `value` to control it; use `defaultValue` otherwise. |
| ref | `Ref<HTMLTextAreaElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| resize | `boolean \| undefined` | false, true | no | true | Show the vertical resize grip. |
| value | `string \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| required | `boolean \| undefined` | false, true | no | — | Marks the field as required; pair it with the corresponding schema validation. |

Also accepts the element’s standard HTML attributes and React DOM events.
