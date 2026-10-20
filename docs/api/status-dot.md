# StatusDot

The bare status dot: tree rows, dock icons, avatar presence, table cells.

`import { StatusDot } from "glass-ux/badge"`

[Live examples](https://dastari.github.io/glass-ux/components/status-dot)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string \| undefined` | See type | no | — | Accessible name. Omit when a visible label already says the state. |
| overlay | `boolean \| undefined` | false, true | no | false | Sit on the corner of an icon or avatar, ringed in the surface colour. |
| status | `StatusKind` | "warning", "error", "online", "offline", "installing", "maintenance", "connecting", "live" | yes | — | Current operation or connection status. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
