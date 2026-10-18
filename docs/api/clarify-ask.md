# ClarifyAsk

A free-text clarification: the agent's question, its best guesses as one-tap answers, and
a field for anything else. Enter sends; Shift+Enter adds a line.

`import { ClarifyAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/clarify-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "clarify"; placeholder?: string; suggestions?: string[]; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredByEntity?: import("../types.js").EntityRef; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The clarification ask: the question, optional `suggestions` as one-tap answers and the free-text `placeholder`. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
