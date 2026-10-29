# Level gauge

`glass-ux/level-gauge` · [Live component catalogue](https://dastari.github.io/glass-ux/)

Where something stands on a small ordered scale such as Low, Moderate and High, where each
level has its own meaning and tone. Segments fill up to the level in its tone, and the level's
name follows in that tone's text colour. An earlier level, such as the rating before
mitigation, stays in view. For a continuous value against thresholds, use a Meter or Gauge.

```tsx
import { LevelGauge } from "glass-ux/level-gauge"

<LevelGauge
  label="Final risk"
  levels={[
    { value: "low", label: "Low", tone: "success" },
    { value: "moderate", label: "Moderate", tone: "warning" },
    { value: "high", label: "High", tone: "danger" },
  ]}
  value="moderate"
  previous="high"
  previousLabel="Before mitigation"
  onPress={() => setHelpOpen(true)}
/>
```

- **Levels:** two to about six, lowest first, each with a `label` and a status `tone`
  (`neutral`, `info`, `success`, `warning` or `danger`). Categorical colours are not used, so
  status colours keep their meaning (R3.3).
- **An earlier level:** `previous` and `previousLabel` (default "Previously"). When the level
  came down, the segments between it and the earlier level are traced: a dashed edge in the
  earlier level's tone. When it rose, the segments gained are striped. Fill, stripe and edge
  stay distinct in forced colours.
- **Not rated:** a `value` that is not on the scale shows `fallback` (default "Not rated") with
  every segment empty, in the same space.
- **Sizes:** `sm` (default) puts the segments and the name on one line, for table cells and
  footers. `md` shows the label and the name, the earlier level and a `note`, full-width
  segments and the scale's names beneath, up to 24rem wide.
- **Pressable:** with `onPress` the whole gauge is a button, normally opening an explanation of
  the levels. Without it the gauge is text and the segments are hidden from assistive
  technology.
- **Accessible name:** "Final risk: Moderate (Before mitigation: High)".
