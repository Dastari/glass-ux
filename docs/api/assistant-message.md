# AssistantMessage

An answer: no bubble — the AI mark in the gutter and the blocks on the canvas (or the
panel), prose across the reading column and wide blocks breaking out wider. Failure, cancellation
and retention show in place as the message's last block. Copy, regenerate, feedback and
"Open in window" sit below with the time and model.

`import { AssistantMessage } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/assistant-message)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| activity | `AiProviderStatus \| undefined` | See type | no | — | What the model is doing right now (before or between blocks) while it streams. |
| latest | `boolean \| undefined` | false, true | no | false | The newest answer: its actions stay visible. |
| message | `AiMessage` | See type | yes | — | The typed conversation message and its content blocks. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
