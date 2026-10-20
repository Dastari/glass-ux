# ToneDot

A tone-keyed state marker without an application-specific status vocabulary.

`import { ToneDot } from "glass-ux/tone-dot"`

[Live examples](https://dastari.github.io/glass-ux/components/tone-dot)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string \| undefined` | See type | no | — | Accessible state name; omit only beside a visible equivalent label. |
| marker | `"dot" \| "ring" \| "pulse" \| undefined` | "dot", "ring", "pulse" | no | "dot" | A solid dot, hollow ring, or compositor-only live pulse. |
| overlay | `boolean \| undefined` | false, true | no | false | Solid corner mark with a separating surface ring. |
| tone | `"data" \| BadgeTone \| undefined` | "data", "danger", "warning", "success", "neutral", "accent", "info" | no | "neutral" | Semantic state, or data for informational activity such as a running timer. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
