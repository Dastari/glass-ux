# Compare slider

`glass-ux/compare-slider` · [Live component catalogue](https://dastari.github.io/glass-ux/)

Two pieces of content laid over each other with a divider between them. They can be anything of
the same size: images, charts, pages or text.

```tsx
import { CompareSlider } from "glass-ux/compare-slider"

<CompareSlider before={<img src={original} alt="Original" />} after={<img src={edited} alt="Edited" />} />
```

- **Value:** a percentage of `before` shown, 0 to 100. `value` and `onValueChange` control it,
  `defaultValue` (50) starts it. A drag writes a custom property and `onValueChange` fires once on
  release, so nothing re-renders while it moves. A press and each key also report.
- **Keyboard:** the divider is a `slider`. Arrows move it the way they point, Shift, Page Up and
  Page Down take ten percent, Home and End go to the ends. `step` sets the arrow's percentage.
- **Single pointer:** pressing anywhere on the content moves the divider there. A press on a
  control inside the content goes to that control.
- **Right to left:** `before` starts at the reading start, so the sides change places. The content
  does not mirror. This is a reading-order choice, so the styles use logical properties throughout.
- **`orientation="vertical"`:** the divider travels down from the top, and the up and down arrows
  move it. `beforeLabel` and `afterLabel` put short names over each side.
