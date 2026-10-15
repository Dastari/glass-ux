# TagInput

Free-entry chips: email recipients, IP addresses, labels. Enter, comma, semicolon or
Tab turns the text into a chip; pasting a list adds every value at once. Values are
normalised and de-duplicated (adding one again flashes the existing chip); invalid ones
stay visible in danger with the reason. Chips are edited in place with Enter or a
double-click. With suggestions or a source, the list offers matches and “Create "x"”.

`import { TagInput } from "glass-ux/tag-input"`

[Live examples](https://dastari.github.io/glass-ux/components/tag-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| allowCreate | `boolean \| undefined` | false, true | no | true | Offer “Create "x"” when the text matches no suggestion (default on). |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| className | `string \| undefined` | See type | no | — | Layout only. Applied to the control box. |
| defaultValue | `string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — | Marks the control invalid. Pair it with an accessible validation message. |
| max | `number \| undefined` | See type | no | — | Most chips allowed. |
| name | `string \| undefined` | See type | no | — | The component’s name or native form field name, as specified by its value type. |
| normalize | `((value: string) => string) \| undefined` | See type | no | — | Tidy a value before it becomes a chip (trim is always applied): lowercase an email… |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when blur occurs. The callback type specifies its arguments. |
| onErrorChange | `((message: string \| undefined) => void) \| undefined` | See type | no | — | The first problem (an invalid chip, or the limit) — show it in the field's message line. |
| onValueChange | `((values: string[]) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| readOnly | `boolean \| undefined` | false, true | no | — | Displays the current value without allowing edits. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| size | `SelectSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| source | `OptionSource<string> \| undefined` | See type | no | — | Or suggestions searched on a server. |
| suggestions | `OptionItem<string>[] \| undefined` | See type | no | — | Static suggestions, filtered as you type. Optional: free entry works without any. |
| validate | `((value: string) => string \| null \| undefined) \| undefined` | See type | no | — | Why a value is not valid, or nothing. Invalid chips turn danger; the reason is their tooltip. |
| value | `string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — | Available width or named width tier. |
| wrap | `boolean \| undefined` | false, true | no | true | Let chips wrap onto more lines (default). Off: one line that folds into "+N". |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
