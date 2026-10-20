# AiMark

The Assistant brand mark. It leads assistant messages, the drawer header, the docked pane
and the landing hero. A brand mark, not an icon (R19.3): the product's configured `ai`
mark (src/ui/brand), drawn inline in the brand tones, so it follows the palette and stays
legible in dark mode.

`import { AiMark } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/ai-mark)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string \| undefined` | See type | no | — | Accessible name. Omit when a nearby label already names the assistant. |
| size | `AiMarkSize \| undefined` | "xs", "sm", "md", "lg" | no | "sm" | xs 16 inline · sm 24 messages · md 32 headers · lg 64 the landing hero. |
| working | `boolean \| undefined` | false, true | no | false | Draw the working ring (a spinner, so it is the one loop allowed, R18.2). |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
