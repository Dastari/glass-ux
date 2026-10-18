# StatusBadge

A status as a badge. The label defaults to the state name.

`import { StatusBadge } from "glass-ux/badge"`

[Live examples](https://dastari.github.io/glass-ux/components/status-badge)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| size | `BadgeSize \| undefined` | "sm", "md" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| status | `StatusKind` | "warning", "error", "online", "offline", "installing", "maintenance", "connecting", "live" | yes | — | Current operation or connection status. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
