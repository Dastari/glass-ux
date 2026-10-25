# AssistantPane

The assistant docked beside a page or opened as a window: a glass pane with the AI mark,
the title and the scope it is pinned to, header actions, then the conversation filling the
rest. Everything inside is container-aware down to 20rem; the pane sets no widths itself.

`import { AssistantPane } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/assistant-pane)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ReactNode` | See type | no | — | Ghost sm buttons before the window controls: new chat, history, open full page. |
| children | `ReactNode` | See type | yes | — | The conversation (a ConversationLog with surface="panel" and the composer footer). |
| scope | `ReactNode` | See type | no | — | The scope as data (R2.2): "NST-C106", "Northstar Studio". |
| title | `string \| undefined` | See type | no | — | "Assistant". |
| working | `boolean \| undefined` | false, true | no | false | Marks the assistant as working; motion follows the appearance preference. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
