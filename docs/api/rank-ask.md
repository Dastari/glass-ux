# RankAsk

Put options in order (rollout groups, fallback printers). Each row moves with its arrow
buttons or Alt+↑ / Alt+↓; the grip shows it can be reordered.

`import { RankAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/rank-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "rank"; options: ChoiceOption[]; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredByEntity?: import("../types.js").EntityRef; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The ranking ask: the question and its `options` in their starting order; the answer is the reordered list. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. |
