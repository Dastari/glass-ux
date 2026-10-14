# Duration

`glass-ux/duration-field` · [Live component catalogue](https://dastari.github.io/glass-ux/)


A duration typed as people say it — "1h 30m", "90" (minutes by default), "1:30", "1.5 hours",
"2 days 4 hrs" — held in whole seconds and rewritten compactly when focus leaves ("1h 30m"). The
hint spells it out ("1 hour 30 minutes"), so a bare number is never misread.

```tsx
import { durationSchema } from "glass-ux/duration-field"

const schema = z.object({ response: durationSchema({ required: true, min: 900, max: 604800 }) })

<form.AppField name="response">{(field) => <field.DurationField label="Response target" units={["d", "h", "m"]} />}</form.AppField>
```

- **Value:** seconds, `number | null`; `NaN` while the text cannot be read ("Enter a duration such
  as 1h 30m, 90m or 1:30").
- **Options:** `units` (written back, largest first; default d, h, m), `defaultUnit` (a bare
  number's unit; default "m").
- **Parts:** `DurationInput`, `parseDuration`, `formatDuration`.
