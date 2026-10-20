# RelativeTime

"2 min ago", ticking on a shared clock; the absolute time is in a keyboard-accessible tooltip (R2.7).

`import { RelativeTime } from "glass-ux/data-table"`

[Live examples](https://dastari.github.io/glass-ux/components/relative-time)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| fallback | `string \| undefined` | See type | no | "Never" | Text for a missing value. |
| value | `string \| number \| Date \| null \| undefined` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |
