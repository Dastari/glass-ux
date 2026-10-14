# ClarifyAsk

A free-text clarification: the agent's question, its best guesses as one-tap answers, and
a field for anything else. Enter sends; Shift+Enter adds a line.

`import { ClarifyAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/clarify-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "clarify"; placeholder?: string; suggestions?: string[]; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The typed request and its current resolution state. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
