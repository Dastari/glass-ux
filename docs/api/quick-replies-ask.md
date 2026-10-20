# QuickRepliesAsk

Quick replies: a handful of short answers as pills. One tap answers; nothing else to
submit. The agent still accepts a typed reply in the composer.

`import { QuickRepliesAsk } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/quick-replies-ask)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `{ type: "quick"; options: ChoiceOption[]; } & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredByEntity?: import("../types.js").EntityRef; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The quick-reply ask: the question and the `options` shown as pills; one tap answers. Answers go to the `answer` conversation handler; once answered, expired or cancelled the card shows its record. |
