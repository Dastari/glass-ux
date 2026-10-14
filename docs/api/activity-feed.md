# ActivityFeed

An activity or notification feed using shared relative times and accessible absolute tooltips.

`import { ActivityFeed } from "glass-ux/activity-feed"`

[Live examples](https://dastari.github.io/glass-ux/components/activity-feed)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| empty | `string \| undefined` | See type | no | "No activity" | One factual line when there are no events. |
| items | `readonly ActivityItem[]` | See type | yes | — | Events in the application's chosen order. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
