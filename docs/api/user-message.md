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

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
