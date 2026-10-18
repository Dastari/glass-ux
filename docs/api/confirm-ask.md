# ConfirmAsk

Yes or no on a consequence the agent spells out. A destructive confirmation takes a second
step inside the card, never a dialog (R13.8): the soft entry point turns the consequence
into a danger notice and the footer into Back and the solid danger button. Esc goes back.

`import { ConfirmAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/confirm-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "confirm"; consequence: string; confirmLabel: string; tone: "warning" \| "danger" \| "accent"; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredByEntity?: import("../types.js").EntityRef; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The confirmation ask: the question, `consequence`, `confirmLabel` and `tone`; `danger` adds the in-card second step. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
