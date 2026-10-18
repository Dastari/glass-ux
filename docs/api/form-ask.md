# FormAsk

A short form the agent needs filled (a ticket, a schedule): stacked fields, one per row,
capped at the form measure (R15). Values the agent already knows arrive pre-filled.
Required fields validate on blur, then as you type; submitting focuses the first gap.

`import { FormAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/form-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "form"; fields: FormField[]; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredByEntity?: import("../types.js").EntityRef; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The form ask: the question and its `fields`, one per row, with values the agent knows pre-filled. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
