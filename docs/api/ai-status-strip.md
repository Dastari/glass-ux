# AiStatusStrip

The conversation's status strip (R14.6, R17.4): the session stream's connection, the
budget and the model, as one caption line under the composer. Background state lives
here, never in a banner: "Reconnecting · attempt 2 · 4 s", "Offline · history stays
readable", "Daily allowance 82%" in the warning tone from 80%.

`import { AiStatusStrip } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/ai-status-strip)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| attempt | `number \| undefined` | See type | no | — | Current retry attempt. |
| budget | `AiBudget \| undefined` | See type | no | — | Remaining capacity and its warning state. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| model | `string \| undefined` | See type | no | — | Selected assistant model or typed view model. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called from Retry now, shown whenever `stream` is not `connected` and this is supplied. |
| retryAt | `number \| undefined` | See type | no | — | Reconnecting: when the next attempt runs (Unix ms) and which attempt it is. |
| stream | `StreamState` | "offline", "reset", "connected", "reconnecting" | yes | — | Current message stream state. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
