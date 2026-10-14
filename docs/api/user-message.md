# UserMessage

A prompt: a compact glass-control bubble on the right, attachments above it, and edit
and copy below on hover or focus (always on touch).

`import { UserMessage } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/user-message)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| editable | `boolean \| undefined` | false, true | no | false | The newest user message: Edit shows (↑ in the composer edits it too). |
| message | `AiMessage` | See type | yes | — | The typed conversation message and its content blocks. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
