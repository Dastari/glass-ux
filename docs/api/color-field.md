# ColorField

A colour as a form field: the hex value is typed in place, and the swatch at its start
opens a ColorPicker in a popover. Works inside `Field` like any input.

`import { ColorField } from "glass-ux/color-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/color-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| alpha | `boolean \| undefined` | false, true | no | false | Offer an opacity slider and keep alpha in the value (`#rrggbbaa`). Default false. |
| aria-describedby | `string \| undefined` | See type | no | — |  |
| aria-label | `string \| undefined` | See type | no | — |  |
| aria-labelledby | `string \| undefined` | See type | no | — |  |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| clearable | `boolean \| undefined` | false, true | no | false | Allow clearing to no colour. Default false. |
| defaultValue | `string \| null \| undefined` | See type | no | null | The starting colour when uncontrolled; null for none. |
| disabled | `boolean \| undefined` | false, true | no | — | Disables interaction while retaining the component’s disabled appearance. |
| eyeDropper | `boolean \| undefined` | false, true | no | — | Offer the browser's eyedropper where it has one (`window.EyeDropper`). Default true. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| invalid | `boolean \| undefined` | false, true | no | — |  |
| labels | `Partial<{ readonly picker: "Colour picker"; readonly area: "Lightness and chroma"; readonly areaValue: (lightness: number, chroma: number) => string; readonly hue: "Hue"; readonly alpha: "Opacity"; readonly hex: "Hex colour"; readonly eyeDropper: "Pick a colour from the screen"; readonly swatches: "Preset colours"; readonly open: "Choose a colour"; readonly none: "No colour"; readonly clear: "Clear colour"; }> \| undefined` | See type | no | — | Wording overrides for this picker. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| name | `string \| undefined` | See type | no | — | Name for a native form submission (a hidden input carries the hex value). |
| onBlur | `((event: FocusEvent<HTMLInputElement>) => void) \| undefined` | See type | no | — | Called when focus leaves the field, for form libraries' touched state. |
| onValueChange | `((value: string \| null) => void) \| undefined` | See type | no | — | Called with the new hex colour, or null when cleared. |
| onValueCommit | `((value: string) => void) \| undefined` | See type | no | — | Called with the hex colour when a change is finished: the pointer is released, a key is pressed, a swatch is chosen or the hex field commits. |
| placeholder | `string \| undefined` | See type | no | — | The prompt shown while the value is empty. It does not replace the field’s label. |
| ref | `Ref<HTMLInputElement> \| undefined` | See type | no | — | Receives the underlying element for focus or measurement. React 19 accepts ref as a normal prop. |
| size | `InputSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| swatches | `ColorSwatch[] \| undefined` | See type | no | — | Preset colours shown under the controls. |
| value | `string \| null \| undefined` | See type | no | — | The colour as hex, or null for none. Pair with `onValueChange` to control it. |
| width | `FieldWidth \| undefined` | "full", "short", "medium" | no | — |  |
