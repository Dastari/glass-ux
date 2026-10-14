# MessageSkeleton

The boxes of a loading turn: a prompt bubble and an answer with prose and one card.

`import { MessageSkeleton } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/message-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| card | `boolean \| undefined` | false, true | no | true | Typed card content or presentation state. |
| lines | `number \| undefined` | See type | no | 3 | Number of text or skeleton lines. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
