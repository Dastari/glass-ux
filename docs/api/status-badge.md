# StatusBadge

A status as a badge. The label defaults to the state name.

`import { StatusBadge } from "glass-ux/badge"`

[Live examples](https://dastari.github.io/glass-ux/components/status-badge)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| size | `BadgeSize \| undefined` | "sm", "md" | no | — | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| status | `StatusKind` | "warning", "error", "online", "offline", "installing", "maintenance", "connecting", "live" | yes | — | Current operation or connection status. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
