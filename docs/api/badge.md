# Badge

A soft pill that labels state or category. Tone carries meaning (R3.3): status tones only
for status, accent for brand or selection, neutral for everything else.

`import { Badge } from "glass-ux/badge"`

[Live examples](https://dastari.github.io/glass-ux/components/badge)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| icon | `ReactNode` | false, true | no | — | Leading icon instead of a marker. Pass the icon without a size. |
| marker | `BadgeMarker \| undefined` | "none", "dot", "ring", "pulse", "spinner" | no | "none" | Leading marker. `dot` is the common case ("● Online"). |
| size | `BadgeSize \| undefined` | "sm", "md" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| tone | `BadgeTone \| undefined` | "danger", "warning", "success", "neutral", "accent", "info" | no | "neutral" | The semantic tone. Use danger and warning for consequences and states. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
