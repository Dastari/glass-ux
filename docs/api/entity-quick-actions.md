# EntityQuickActions

Up to `max` promoted actions from the entity's set (R12), as small buttons.

`import { EntityQuickActions } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-quick-actions)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| entity | `EntityRef` | See type | yes | — | Entity reference supplied by the host. |
| max | `number \| undefined` | See type | no | 2 | Upper value or visible-item limit, as specified by the type. |
