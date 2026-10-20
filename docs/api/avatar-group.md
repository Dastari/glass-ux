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

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
