# EntityStateBadge

The entity's state as a badge: its live status or its toned state (ticket, alert).

`import { EntityStateBadge } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-state-badge)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| entity | `EntityRef` | See type | yes | — | The entity whose `status` (preferred) or toned `state` is shown; renders nothing when it has neither. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
