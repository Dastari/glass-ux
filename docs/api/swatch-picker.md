# SwatchPicker

One colour from a small set (a palette, an organisation's tint): round swatches in a
recessed track, each named by a tooltip. The chosen swatch takes an accent ring. Arrow
keys move between swatches; the group is one tab stop. In a SettingRow the row's label
names it, like a segmented control.

`import { SwatchPicker } from "glass-ux/swatch-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/swatch-picker)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| defaultValue | `V \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| onBlur | `((event: FocusEvent<HTMLDivElement>) => void) \| undefined` | See type | no | — | Called when blur occurs. The callback type specifies its arguments. |
| onValueChange | `((value: V) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| options | `SwatchOption<V>[]` | See type | yes | — | The available choices, including their values and visible labels. |
| size | `SwatchPickerSize \| undefined` | "sm", "md" | no | "md" | sm 32 for toolbars, md 40 beside fields and segmented controls (default). |
| value | `V \| null \| undefined` | See type | no | — | The chosen swatch. `null` when none is (a custom colour is in use). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
