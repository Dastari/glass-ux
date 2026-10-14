# ApprovalCard

An approval request: the agent wants to run a consequential action. It names the action
and its targets, says what will happen, shows the exact command (the canonical preview),
and notes when step-up (MFA) follows. Approve is the final confirmation, so it is the
solid tone button (R11.9).

Destructive and Assured (MFA) approvals confirm in a second step inside the card, never
behind a scrim (R13.8): "Review and approve" turns the effect into a toned notice and the
footer into Back and the single solid button. Esc goes back.
Decisions confirm in the button, then the card folds into its record, which shows the run
and updates in place.

`import { ApprovalCard } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/approval-card)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `import("../types.js").ApprovalAsk & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The typed request and its current resolution state. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
