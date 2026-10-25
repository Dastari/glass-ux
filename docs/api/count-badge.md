# CountBadge

A number beside a navigation item or group ("Endpoints 12"), or on a corner (overlay). Tabular figures.

`import { CountBadge } from "glass-ux/badge"`

[Live examples](https://dastari.github.io/glass-ux/components/count-badge)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| max | `number \| undefined` | See type | no | 999 | Above this, show "max+". |
| overlay | `boolean \| undefined` | false, true | no | false | It sits on another element's corner (an avatar, a rail or dock icon, an entity tile): a solid fill and a ring in the colour beneath, never the soft tint. Position it from the outside. |
| tone | `"danger" \| "accent" \| "neutral" \| undefined` | "danger", "accent", "neutral" | no | "neutral" | The semantic tone. Use danger and warning for consequences and states. |
| value | `number` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
