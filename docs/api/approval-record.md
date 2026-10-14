# ApprovalRecord

The record of a decided approval: one line in the transcript. While it is approved and
running it carries Revoke; it updates in place to executed, failed or revoked.

`import { ApprovalRecord } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/approval-record)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| ask | `import("../types.js").ApprovalAsk & { id: string; question: string; detail?: string; status?: import("../types.js").AskState; answer?: string; answeredBy?: string; answeredByEntity?: import("../types.js").EntityRef; answeredAt?: number; submitLabel?: string; }` | See type | yes | — | The typed request and its current resolution state. |
| onRevoke | `(() => Promise<void>) \| undefined` | See type | no | — | While approved and not yet run: withdraw it (RevokeAiApproval). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
