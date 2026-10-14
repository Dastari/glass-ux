# RankAsk

Put options in order (rollout groups, fallback printers). Each row moves with its arrow
buttons or Alt+↑ / Alt+↓; the grip shows it can be reordered.

`import { RankAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/rank-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "rank"; options: ChoiceOption[]; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredByEntity?: import("../types.js").EntityRef; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The typed request and its current resolution state. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
