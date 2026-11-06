# AssistantMessage

An answer: no bubble — the AI mark in the gutter and the blocks on the canvas (or the
panel), prose across the reading column and wide blocks breaking out wider. Failure, cancellation
and retention show in place as the message's last block. Copy, regenerate, feedback and
"Open in window" sit below with the time and model; a host with no backend for feedback or
windows turns those off (`feedback`, `openInWindow`).

`import { AssistantMessage } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/assistant-message)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| activity | `AiProviderStatus \| undefined` | See type | no | — | What the model is doing right now (before or between blocks) while it streams. |
| feedback | `boolean \| undefined` | false, true | no | true | Show the good and bad response buttons. Turn off when the host has nowhere to send feedback. |
| latest | `boolean \| undefined` | false, true | no | false | The newest answer: its actions stay visible. |
| message | `AiMessage` | See type | yes | — | The typed conversation message and its content blocks. |
| openInWindow | `boolean \| undefined` | false, true | no | true | Show "Open in a window". Turn off when the host has no window to open the answer in. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
