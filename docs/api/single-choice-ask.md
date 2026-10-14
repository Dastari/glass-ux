# SingleChoiceAsk

One choice from a few options, each with a sentence: radio cards that reflow by width.

`import { SingleChoiceAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/single-choice-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "single"; options: ChoiceOption[]; layout?: "cards" \| "list"; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredByEntity?: import("../types.js").EntityRef; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The typed request and its current resolution state. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
