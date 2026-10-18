# SecretInput

A write-only secret (BR notes): a stored value is never shown, only "Set", with Replace
and Clear. Replace swaps in an empty password box (with Keep current to back out); Clear
marks it for removal on save (with Undo). With nothing stored, the box takes a new value.

`import { SecretInput } from "glass-ux/entity-settings"`

[Live examples](https://dastari.github.io/glass-ux/components/secret-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Marks the control invalid. Pair it with an accessible validation message. |
| name | `string \| undefined` | See type | no | "secret" | Names the secret for its buttons: "community" → "Replace community". |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called with the blur event of the password box or the action buttons; pass the form field's `handleBlur`. |
| onValueChange | `(value: SecretValue) => void` | See type | yes | — | Called with the whole next secret state when the person types, Replaces, Clears, keeps the current value or undoes; `stored` is passed through unchanged. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| value | `SecretValue` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Available width or named width tier. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
