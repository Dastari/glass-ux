# SingleChoiceAsk

One choice from a few options, each with a sentence: radio cards that reflow by width.

`import { SingleChoiceAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/single-choice-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "single"; options: ChoiceOption[]; layout?: "cards" \| "list"; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredByEntity?: import("../types.js").EntityRef; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The single-choice ask: the question and its `options`. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. |
