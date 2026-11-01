# GradientPicker

A gradient built on ColorPicker: linear, radial or angular, with stops along a rail. Drag a stop,
press the rail to add one, or use Add stop and the Position field, which need no drag. Each stop
is a slider: arrow keys move it (Shift for ten percent), Home and End go to the ends and Delete
removes it. The rail follows the gradient's own axis, left to right in every language, as the
colour picker's axes do. The value is `GradientValue`; `gradientToCss` turns it into CSS, and the
preview shows that same string, in sRGB, so it looks the same on any display.

`import { GradientPicker } from "glass-ux/gradient-picker"`

[Live examples](https://dastari.github.io/glass-ux/components/gradient-picker)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| alpha | `boolean \| undefined` | false, true | no | false | Offer opacity on each stop (`#rrggbbaa`). Default false. |
| aria-label | `string \| undefined` | See type | no | — | Accessible name for the picker group when no visible label names it. |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that name the picker. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| defaultValue | `GradientValue \| undefined` | See type | no | DEFAULT_GRADIENT | The starting gradient when uncontrolled. Default: a mid blue to a pale violet. |
| disabled | `boolean \| undefined` | false, true | no | false | Disables interaction while retaining the component’s disabled appearance. |
| eyeDropper | `boolean \| undefined` | false, true | no | — | Offer the browser's eyedropper where it has one. Default true. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| kinds | `readonly GradientKind[] \| undefined` | See type | no | KINDS | The types to offer, in order. Default all three. |
| labels | `Partial<{ picker: string; preview: string; kind: string; linear: string; radial: string; angular: string; angle: string; stops: string; stop: (number: string) => string; stopValue: (position: string, color: string) => string; position: string; addStop: string; removeStop: string; mostStops: (count: string) => string; fewestStops: string; }> \| undefined` | See type | no | — | Wording overrides for this picker. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| maxStops | `number \| undefined` | See type | no | 8 | The most stops a gradient may hold. Default 8. |
| onValueChange | `((value: GradientValue) => void) \| undefined` | See type | no | — | Called with the gradient when a change is finished: a stop or colour drag released, a key, a typed number. A drag only repaints until then. |
| swatches | `ColorSwatch[] \| undefined` | See type | no | — | Preset colours for a stop. |
| value | `GradientValue \| undefined` | See type | no | — | The gradient. Pair with `onValueChange` to control it. |
