# Badge

A soft pill that labels state or category. Tone carries meaning (R3.3): status tones only
for status, accent for brand or selection, neutral for everything else.

`import { Badge } from "glass-ux/badge"`

[Live examples](https://dastari.github.io/glass-ux/components/badge)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| icon | `ReactNode` | See type | no | — | Leading icon instead of a marker. Pass the icon without a size. |
| marker | `BadgeMarker \| undefined` | "none", "dot", "ring", "pulse", "spinner" | no | "none" | Leading marker. `dot` is the common case ("● Online"). |
| size | `BadgeSize \| undefined` | "sm", "md" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| tone | `BadgeTone \| undefined` | "danger", "warning", "success", "accent", "neutral", "info" | no | "neutral" | The semantic tone. Use danger and warning for consequences and states. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
