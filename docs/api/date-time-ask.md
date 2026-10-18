# DateTimeAsk

When something should happen: the agent's suggested times as one-tap choices, or an exact
date and time, in the stated time zone.

`import { DateTimeAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/date-time-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "datetime"; suggestions: Array<{ label: string; value: string; }>; timezone: string; earliest?: string; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredByEntity?: import("../types.js").EntityRef; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The date-time ask: the question, suggested times, the IANA `timezone` they are read in and an optional `earliest` bound. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
