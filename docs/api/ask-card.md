# AskCard

Any human-in-the-loop ask by its type. Approvals and structured requests are rendered through application handlers
(AiApprovalView); the rest are the proposed structured asks (docs/ai-ui.md).

Asks are never modal (R13.8). Inside a conversation a pending ask is pinned in the ask dock
above the composer and this place in the transcript shows a marker with Review; once it is
answered the marker becomes the record. On its own (outside a ConversationLog) the card
renders here.

`import { AskCard } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/ask-card)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `AiAsk` | See type | yes | — | The ask to render; its `type` picks the card. Inside a ConversationLog a pending ask moves to the ask dock and leaves a marker here. |
