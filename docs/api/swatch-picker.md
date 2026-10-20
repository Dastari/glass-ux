# SwatchPicker

One colour from a small set (a palette, an organisation's tint): round swatches in a
recessed track, each named by a tooltip. The chosen swatch takes an accent ring. Arrow
keys move between swatches; the group is one tab stop. In a SettingRow the row's label
names it, like a segmented control.

Container-aware (R7), like Segmented: when the swatches do not fit the box it is given,
the track holds one button showing the chosen swatch and a chevron, whose menu lists every
swatch with its name and a check on the chosen one. The button keeps its width whatever
the value. The value, onValueChange and the group's accessible name are the same in both
forms.

`import { SwatchPicker } from "glass-ux/swatch-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/swatch-picker)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when a visible label does not name the control. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that provide the accessible name. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| collapse | `SwatchPickerCollapse \| undefined` | "menu", "none", "auto" | no | — | What happens when the swatches do not fit: "auto" (default) folds to one menu button showing the chosen swatch; "menu" always shows it; "none" wraps the swatches. Default: the host's SegmentedCollapseContext, else "auto". |
| defaultValue | `V \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| onBlur | `((event: FocusEvent<HTMLDivElement>) => void) \| undefined` | See type | no | — | Called with the focus event when focus leaves the whole picker, not when it moves between swatches. For form libraries' touched state. |
| onValueChange | `((value: V) => void) \| undefined` | See type | no | — | Called with the chosen swatch's `value` when the person picks one (a swatch, or a menu item in the menu form); pressing the current swatch does not deselect it. Pair with `value` to control it. |
| options | `SwatchOption<V>[]` | See type | yes | — | The available choices, including their values and visible labels. |
| size | `SwatchPickerSize \| undefined` | "sm", "md" | no | "md" | sm 32 for toolbars, md 40 beside fields and segmented controls (default). |
| value | `V \| null \| undefined` | See type | no | — | The chosen swatch. `null` when none is (a custom colour is in use). |
