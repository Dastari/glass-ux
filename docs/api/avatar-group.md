# AvatarGroup

Overlapping faces for "who is here" (watchers, active sessions).

`import { AvatarGroup } from "glass-ux/avatar"`

[Live examples](https://dastari.github.io/glass-ux/components/avatar-group)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| max | `number \| undefined` | See type | no | 4 | Show at most this many faces, then "+N". |
| people | `{ name: string; src?: string; }[]` | See type | yes | — | The people rendered in the avatar group, in display order. |
| size | `AvatarSize \| undefined` | "xs", "sm", "md", "lg", "xl" | no | "sm" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
