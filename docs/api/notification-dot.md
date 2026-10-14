# NotificationDot

A small dot on the corner of an icon button (unread notifications). The parent must be
positioned.

`import { NotificationDot } from "glass-ux/badge"`

[Live examples](https://dastari.github.io/glass-ux/components/notification-dot)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string` | See type | yes | — | Accessible name, e.g. "3 unread notifications". |
| tone | `"danger" \| "accent" \| undefined` | "danger", "accent" | no | "accent" | The semantic tone. Use danger and warning for consequences and states. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
