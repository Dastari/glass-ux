# NotificationDot

A small dot on the corner of an icon button (unread notifications). The parent must be
positioned.

`import { NotificationDot } from "glass-ux/badge"`

[Live examples](https://dastari.github.io/glass-ux/components/notification-dot)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string` | See type | yes | — | Accessible name, e.g. "3 unread notifications". |
| tone | `"danger" \| "accent" \| undefined` | "danger", "accent" | no | "accent" | The semantic tone. Use danger and warning for consequences and states. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
