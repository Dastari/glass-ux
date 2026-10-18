# ResultValue

A single figure or short text from a tool (a count, a state), or a withheld preview.

`import { ResultValue } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-value)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "value"; label: string; value: string \| number \| null; unit?: string; detail?: string; redacted?: RedactedValue; }` | See type | yes | — | The value result: a `label` and a number (shown as a metric with `unit`), a string, or `null` (shown as "—"); `redacted` replaces the value with the withheld treatment. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
