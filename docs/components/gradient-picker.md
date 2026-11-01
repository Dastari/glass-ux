# Gradient picker

`glass-ux/gradient-picker` · [Live component catalogue](https://dastari.github.io/glass-ux/)

Linear, radial and angular gradients, built on `ColorPicker`. The value is typed data, and
`gradientToCss` turns it into a `background-image` value.

```tsx
import { GradientPicker, gradientToCss } from "glass-ux/gradient-picker"

<GradientPicker value={gradient} onValueChange={setGradient} />
<div style={{ backgroundImage: gradientToCss(gradient) }} />
```

- **Value:** `{ kind, angle, stops, interpolation }`. `stops` are `{ color, position }`, hex and 0 to
  100 percent, in position order, at least two. `angle` is degrees clockwise, as in CSS: 90 runs
  to the right. A radial gradient ignores it, so the Angle field turns off.
- **`onValueChange`:** fires when a change is finished: a drag released, a key, a typed number. A
  drag repaints the preview, rail and stop directly until then.
- **Stops:** drag one, or press the rail to add one in the colour already there. Without a drag,
  use Add stop (the middle of the widest gap), Remove stop and the Position field. `maxStops`
  (default 8) limits them; an unavailable button says why.
- **Keyboard:** each stop is a slider and its own tab stop, as the thumbs of a range are. Arrows
  move it one percent, Shift, Page Up and Page Down ten, Home and End go to the ends, Delete
  removes it. Focusing a stop opens it in the colour picker.
- **Direction:** the rail is the gradient's own axis, so it runs left to right in every language,
  as the colour picker's axes do. A gradient itself does not mirror.
- **Gamut:** stops are hex, and the preview paints exactly what `gradientToCss` writes, so it cannot
  show a colour the value cannot. `interpolation: "oklab"` blends evenly to the eye; the blend is
  written as extra sRGB stops, each brought inside the gamut, rather than `in oklab`, so it looks the
  same on every display and in every browser.
- **Helpers:** `addGradientStop`, `moveGradientStop`, `removeGradientStop` and `gradientColorAt` are
  pure, with no DOM, for a server or a worker.
