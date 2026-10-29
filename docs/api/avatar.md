# Avatar

A person or account. The image falls back to initials on a deterministic tint drawn from
the palette, so a missing photo still identifies someone at a glance.

`import { Avatar } from "glass-ux/avatar"`

[Live examples](https://dastari.github.io/glass-ux/components/avatar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| decorative | `boolean \| undefined` | false, true | no | false | Hide from assistive tech when a visible name sits beside it. |
| name | `string` | See type | yes | — | The person's (or account's) name: drives the initials, tint and accessible name. |
| presence | `Presence \| undefined` | "online", "away", "busy", "offline" | no | — | The person’s live availability, drawn as a presence indicator. |
| size | `AvatarSize \| undefined` | "xs", "sm", "md", "lg", "xl", "2xl" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| src | `string \| undefined` | See type | no | — | Image URL; the component uses its fallback when it is absent or fails. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
