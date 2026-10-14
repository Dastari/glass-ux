# AssistantPane

The assistant docked beside a page or opened as a window: a glass pane with the AI mark,
the title and the scope it is pinned to, header actions, then the conversation filling the
rest. Everything inside is container-aware down to 20rem; the pane sets no widths itself.

`import { AssistantPane } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/assistant-pane)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ReactNode` | false, true | no | — | Ghost sm buttons before the window controls: new chat, history, open full page. |
| children | `ReactNode` | false, true | yes | — | The conversation (a ConversationLog with surface="panel" and the composer footer). |
| scope | `ReactNode` | false, true | no | — | The scope as data (R2.2): "NST-C106", "Northstar Studio". |
| title | `string \| undefined` | See type | no | "Assistant" | "Assistant". |
| working | `boolean \| undefined` | false, true | no | false | Marks the assistant as working; motion follows the appearance preference. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
