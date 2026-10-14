# DateTimeAsk

When something should happen: the agent's suggested times as one-tap choices, or an exact
date and time, in the stated time zone.

`import { DateTimeAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/date-time-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "datetime"; suggestions: Array<{ label: string; value: string; }>; timezone: string; earliest?: string; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The typed request and its current resolution state. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
