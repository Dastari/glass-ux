# AskShell

Folds an ask into its record: the box animates from the ask's height to the record's
(--duration-slow), so resolving never jumps; while the conversation is pinned to the
bottom, the content above moves instead of the messages below (see ConversationLog).

`import { AskShell } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/ask-shell)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| record | `ReactNode` | false, true | yes | — | Resolved request or audit record displayed by the component. |
| resolved | `boolean` | false, true | yes | — | Resolved state of the request. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
