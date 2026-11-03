# ColorWheel

A colour wheel: a hue and an amount around a neutral centre, the control for a colour balance,
a grade's shadows, midtones and highlights, or a tint. The value is `{ hue, amount }`: the OKLCH
hue in degrees, at its angle on the wheel (0° to the right of the centre, rising
counter-clockwise, in every language, as in a chart), and the amount from 0 at the centre to
`max` at the rim. The disc is drawn in OKLCH at one lightness, so the hues are evenly spaced and
equally strong; `colorWheelColor` gives the colour under the bead.

Pointer: press or drag anywhere on the wheel; a double press returns to neutral.

Keyboard: the wheel is one tab stop holding two sliders, Hue and Amount. Left and Right turn the
hue (Right raises the angle; in a right-to-left language the keys swap, as in every slider). Up
and Down change the amount, outward and back. Shift with an arrow takes ten steps; Page Up and
Page Down change the amount by ten steps; Home returns to neutral and End goes to the rim, both
keeping the hue. Focus moves to the slider whose value the key changed, so a screen reader
speaks the value that moved: the hue as its colour family and angle ("Green, 142°"), the
amount as a percentage of `max`, or "Neutral" at the centre. At the centre the hue is kept, so
the next step outward continues in it.

`import { ColorWheel } from "glass-ux/color-wheel"`

[Live examples](https://dastari.github.io/glass-ux/components/color-wheel)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-describedby | `string \| undefined` | See type | no | — | IDs of elements that describe the wheel's group. |
| aria-label | `string \| undefined` | See type | no | — | Accessible name for the wheel's group ("Shadows") when no visible label names it. Default "Colour wheel". |
| aria-labelledby | `string \| undefined` | See type | no | — | IDs of elements that name the wheel's group. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| defaultValue | `ColorWheelValue \| undefined` | See type | no | NEUTRAL | The starting value when uncontrolled. Default `{ hue: 0, amount: 0 }`, neutral. |
| disabled | `boolean \| undefined` | false, true | no | false | Disables interaction while retaining the component’s disabled appearance. |
| format | `((amount: number) => string) \| undefined` | See type | no | — | Formats the amount in the readout and in its spoken value. Default: a percentage of `max` in the locale's form. |
| hueStep | `number \| undefined` | See type | no | 1 | Degrees per arrow key; pointer values snap to it too. Default 1. Shift takes ten. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| labels | `Partial<{ wheel: string; hue: string; amount: string; hueValue: ({ name, angle }: { name: string; angle: string; }) => string; neutral: string; readout: ({ angle, amount }: { angle: string; amount: string; }) => string; hueRed: string; hueOrange: string; hueYellow: string; hueGreen: string; hueCyan: string; hueBlue: string; huePurple: string; hueMagenta: string; }> \| undefined` | See type | no | — | Wording overrides for this wheel. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| max | `number \| undefined` | See type | no | 100 | The amount at the rim. Default 100. The value never goes past it. |
| onValueChange | `((value: ColorWheelValue) => void) \| undefined` | See type | no | — | Called with the new value on every change, while dragging too. |
| onValueCommitted | `((value: ColorWheelValue) => void) \| undefined` | See type | no | — | Called once per gesture with the final value: when the pointer is released, on each key press, on a double press back to neutral. Not called when the gesture changed nothing. |
| readout | `boolean \| undefined` | false, true | no | false | Show the hue and amount under the wheel ("142° · 35%", or "Neutral"). Its line is reserved, so nothing moves as it changes. Default false. |
| size | `"sm" \| "md" \| undefined` | "sm", "md" | no | "md" | `md` (default) or `sm`, a smaller wheel and bead for tool panels, matching ColorPicker's sizes. The wheel shrinks to fit a narrower box; its hit area is the whole disc. |
| step | `number \| undefined` | See type | no | max / 100 | The amount per arrow key; pointer values snap to it too. Default `max / 100`. Shift and Page Up/Down take ten. |
| value | `ColorWheelValue \| undefined` | See type | no | — | The value: `hue` in degrees and `amount` from 0 (neutral) to `max`. Pair with `onValueChange` to control it. |
| variant | `"ring" \| "disc" \| undefined` | "ring", "disc" | no | "disc" | `disc` (default): the colour disc itself, grey at the centre and full colour at the rim, so the colour under the bead is the colour chosen. `ring`: a hue ring around a recessed neutral well, a quieter look where several wheels sit side by side; the bead carries the colour. |
