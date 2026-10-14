# MultiChoiceAsk

Several items from a list, with Select all. Checkboxes are for picking items (R15.4).

`import { MultiChoiceAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/multi-choice-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "multi"; options: ChoiceOption[]; min?: number; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredByEntity?: import("../types.js").EntityRef; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The typed request and its current resolution state. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
