# CountBadge

A number beside a navigation item or group ("Endpoints 12"), or on a corner (overlay). Tabular figures.

`import { CountBadge } from "glass-ux/badge"`

[Live examples](https://dastari.github.io/glass-ux/components/count-badge)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| max | `number \| undefined` | See type | no | 999 | Above this, show "max+". |
| overlay | `boolean \| undefined` | false, true | no | false | It sits on another element's corner (an avatar, a rail or dock icon, an entity tile): a solid fill and a ring in the colour beneath, never the soft tint. Position it from the outside. |
| tone | `"danger" \| "neutral" \| "accent" \| undefined` | "danger", "neutral", "accent" | no | "neutral" | The semantic tone. Use danger and warning for consequences and states. |
| value | `number` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
