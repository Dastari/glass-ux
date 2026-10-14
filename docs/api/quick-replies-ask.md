# QuickRepliesAsk

Quick replies: a handful of short answers as pills. One tap answers; nothing else to
submit. The agent still accepts a typed reply in the composer.

`import { QuickRepliesAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/quick-replies-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "quick"; options: ChoiceOption[]; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredByEntity?: import("../types.js").EntityRef; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The typed request and its current resolution state. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
