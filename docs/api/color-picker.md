# ColorPicker

A colour picker in OKLCH, the space the library's palettes use: an area of lightness and
chroma at the chosen hue (colours the screen cannot show are drawn faintly, and choosing one
moves to the nearest colour that can be shown), a hue slider, an optional opacity slider, a
hex field, preset swatches and the browser's eyedropper where available. Values are hex.

Keyboard: in the area, ↑ ↓ change lightness and ← → chroma (Shift for larger steps, Page
Up/Down for lightness by 10%, Home/End for no chroma and the most). The sliders follow the
slider pattern.

`import { ColorPicker } from "glass-ux/color-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/color-picker)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| alpha | `boolean \| undefined` | false, true | no | false | Offer an opacity slider and keep alpha in the value (`#rrggbbaa`). Default false. |
| aria-label | `string \| undefined` | See type | no | — | Accessible name for the picker group when no visible label names it. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that name the picker. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| defaultValue | `string \| undefined` | See type | no | — | The starting colour when uncontrolled. Default: a mid blue. |
| disabled | `boolean \| undefined` | false, true | no | false | Disables interaction while retaining the component’s disabled appearance. |
| eyeDropper | `boolean \| undefined` | false, true | no | true | Offer the browser's eyedropper where it has one (`window.EyeDropper`). Default true. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| labels | `Partial<{ picker: string; area: string; areaValue: (lightness: number, chroma: number) => string; hue: string; alpha: string; hex: string; eyeDropper: string; swatches: string; open: string; none: string; clear: string; }> \| undefined` | See type | no | — | Wording overrides for this picker. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called with the new hex colour on every change, while dragging too. |
| onValueCommit | `((value: string) => void) \| undefined` | See type | no | — | Called with the hex colour when a change is finished: the pointer is released, a key is pressed, a swatch is chosen or the hex field commits. |
| swatches | `ColorSwatch[] \| undefined` | See type | no | — | Preset colours shown under the controls. |
| value | `string \| undefined` | See type | no | — | The colour as hex (`#rrggbb`, or `#rrggbbaa` with `alpha`). Pair with `onValueChange` to control it. |
