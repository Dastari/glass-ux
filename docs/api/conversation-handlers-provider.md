# ConversationHandlersProvider

Connect assistant interaction events to host callbacks for answers, approvals, retries, feedback and opening results.

`import { ConversationHandlersProvider } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/conversation-handlers-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| handlers | `Partial<ConversationHandlers>` | See type | yes | — | The host callbacks to use; any left out keep the defaults (async actions resolve at once, window requests are logged). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
