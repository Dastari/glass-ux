# MessageSkeleton

The boxes of a loading turn, or an assistant-only reply, with stable loaded geometry.

`import { MessageSkeleton } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/message-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| card | `boolean \| undefined` | false, true | no | true | Include the result-card placeholder. Default: true. |
| lines | `number \| undefined` | See type | no | 3 | Number of prose skeleton lines. Default: 3. |
| prompt | `boolean \| undefined` | false, true | no | true | Include the loading prompt bubble. Set false when only an assistant reply is loading. Default: true. |
