# MultiChoiceAsk

Several items from a list, with Select all. Checkboxes are for picking items (R15.4).

`import { MultiChoiceAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/multi-choice-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "multi"; options: ChoiceOption[]; min?: number; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredByEntity?: import("../types.js").EntityRef; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The multiple-choice ask: the question, its `options` and `min`, the fewest picks that can be sent (default 1). Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
