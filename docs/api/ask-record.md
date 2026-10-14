# AskRecord

The compact record an ask folds into once it is answered, approved, denied or expired.

`import { AskRecord } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/ask-record)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| action | `ReactNode` | false, true | no | — | One trailing action (Ask again, Open). |
| at | `number \| undefined` | See type | no | — | Time associated with the record. |
| by | `string \| undefined` | See type | no | — | Who and when: "Avery Quinn · 10:44 am". |
| children | `ReactNode` | false, true | yes | — | What was decided, in words: "Chose Ricoh IM C3000 · Level 2". |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| glyph | `ReactNode` | false, true | no | — | Replace the status glyph (a pending question shows IconHelp, not the approval shield). |
| status | `ToolStatus` | "queued", "cancelled", "failed", "running", "succeeded", "awaiting-approval" | yes | — | Current operation or connection status. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
