# Colour wheel

`glass-ux/color-wheel` · [Live component catalogue](https://dastari.github.io/glass-ux/)

A hue and an amount around a neutral centre: colour balance, a grade's shadows, midtones and
highlights, or a tint. To choose a colour, use ColorPicker.

```tsx
import { ColorWheel } from "glass-ux/color-wheel"

<ColorWheel aria-label="Shadows" size="sm" readout value={shadows} onValueChange={setShadows} />
```

- **Value:** `{ hue, amount }`. `hue` is the OKLCH hue in degrees, 0 to under 360; `amount` runs
  from 0 at the centre to `max` (100) at the rim. `value` and `onValueChange` control it,
  `defaultValue` starts it (neutral). `onValueChange` fires while dragging, without the wheel
  re-rendering itself; `onValueCommitted` fires once per gesture and not for one that changed
  nothing. Pointer values snap to `step` (`max / 100`) and `hueStep` (1°).
- **Disc:** the OKLab a–b plane at one lightness, where every hue reaches the same chroma in
  sRGB, so the hues are evenly spaced. 0° is to the right and hues rise counter-clockwise, in
  every language. `colorWheelColor(value, max)` returns the colour under the bead, for
  `cssColor` or `formatHex` from `glass-ux/color-picker`.
- **Keyboard:** one tab stop holding two sliders, Hue and Amount. Left and Right turn the hue
  (they swap in right-to-left text, as in every slider); Up and Down change the amount; Shift
  takes ten steps, as do Page Up and Page Down for the amount; Home returns to neutral and End
  goes to the rim, both keeping the hue. Focus moves to the slider whose value the key changed,
  so a screen reader speaks the value that moved: "Green, 142°", "35%" or "Neutral".
- **Pointer:** press or drag anywhere on the disc; a double press returns to neutral.
- **`variant`:** `disc` (default) shows the colours under the bead; `ring` draws the hues as a
  ring around a recessed neutral well, quieter where several wheels sit together.
- **`size`:** `md`, or `sm` for tool panels. The wheel shrinks to fit a narrower box; the whole
  disc is the hit area. `readout` shows "142° · 35%" under it on a reserved line; `format`
  writes the amount there and in the spoken value.
