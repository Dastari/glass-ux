# Percentage

`glass-ux/percent-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)

A percentage with `%` as its unit, clamped to its bounds (0–100 by default). The value is a whole
percent (90) or, with `scale="fraction"`, a fraction (0.9) as many APIs store it. Built on
NumberField.

```tsx
import { percentSchema } from "glass-ux/percent-field"

const schema = z.object({ disk: percentSchema({ required: true, min: 50, max: 99 }) })

<form.AppField name="disk">{(field) => <field.PercentField label="Disk alert threshold" min={50} max={99} />}</form.AppField>
```

Options: `scale`, `decimals` (default 0), `min`/`max` in the value's scale.
