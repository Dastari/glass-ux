# StatusDot

The bare status dot: tree rows, dock icons, avatar presence, table cells.

`import { StatusDot } from "glass-ux/badge"`

[Live examples](https://dastari.github.io/glass-ux/components/status-dot)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string \| undefined` | See type | no | — | Accessible name. Omit when a visible label already says the state. |
| overlay | `boolean \| undefined` | false, true | no | false | Sit on the corner of an icon or avatar, ringed in the surface colour. |
| status | `EndpointStatus` | "warning", "error", "online", "offline", "installing", "maintenance", "connecting", "live" | yes | — | Current operation or connection status. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
