# DesktopSession

The live desktop block: the target's screen with a state badge on it, the steps the
assistant took and is taking, and a large Stop. Stop and Take over are always reachable
while the AI holds the screen; nothing else in the conversation competes with them.

`import { DesktopSession } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/desktop-session)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| endpoint | `EntityRef \| undefined` | See type | no | — | Endpoint presentation data supplied by the host. |
| leaseEndsAt | `number \| undefined` | See type | no | — | Unix ms the control lease ends (counts down while controlling). |
| onResume | `(() => void) \| undefined` | See type | no | — | Called when resume occurs. The callback type specifies its arguments. |
| onStop | `(() => void) \| undefined` | See type | no | — | Called when stop occurs. The callback type specifies its arguments. |
| onTakeOver | `(() => void) \| undefined` | See type | no | — | Called when take over occurs. The callback type specifies its arguments. |
| pendingAction | `{ label: string; effect: string; onApprove?: () => Promise<unknown>; onDeny?: () => Promise<unknown>; } \| undefined` | See type | no | — | The consequential action waiting for approval (awaiting-action). |
| reason | `string \| undefined` | See type | no | — | Why it paused, failed or ended, one line. |
| screen | `ResultImage \| undefined` | See type | no | — | The latest frame. Its box keeps the frame's ratio, so frames never move the layout. |
| startedAt | `number` | See type | yes | — | Unix ms the session started (the timer ticks while active). |
| state | `DesktopState` | "expired", "failed", "observing", "controlling", "awaiting-action", "paused", "human", "ended" | yes | — | Controlled view state, including loading, empty and error states. |
| steps | `DesktopStep[]` | See type | yes | — | Ordered steps representing the progress or reasoning sequence. |
| target | `EntityRef \| undefined` | See type | no | — | The device or workspace being viewed, as presentation data supplied by the host. Required unless the deprecated `endpoint` is given. |
| user | `string \| undefined` | See type | no | — | Who is signed in on the target ("AzureAD\\MiraRowan"). |
| userEntity | `EntityRef \| undefined` | See type | no | — | Resolved signed-in person identity, rendered through the host entity adapter. |
| userIdentity | `ReactNode` | See type | no | — | Host identity adapter, e.g. an account chip, when the signed-in value is a legacy account string. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
