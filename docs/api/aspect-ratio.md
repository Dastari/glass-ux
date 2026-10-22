# AspectRatio

A box that keeps a width:height ratio at any width and fills it with its children: each
direct child is placed at inset 0. Use it for screen previews, video and images whose shape
is known before they load, so nothing moves when they arrive. It has no glass of its own:
put it in a Panel or tile.

`import { AspectRatio } from "glass-ux/aspect-ratio"`

[Live examples](https://dastari.github.io/glass-ux/components/aspect-ratio)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| fit | `"contain" \| "cover" \| undefined` | "contain", "cover" | no | — | `object-fit` for an img, video or canvas child. Unset, the child stretches to the box. |
| maxHeight | `import("csstype").Property.MaxHeight<string \| number> \| undefined` | See type | no | — | The tallest the box may be. When it applies, the box narrows to keep its ratio and centres in its row. |
| radius | `AspectRatioRadius \| undefined` | "dialog", "none", "control", "tile", "surface", "overlay", "media" | no | "media" | Corner role, clipped through to the children. Default `media`. |
| ratio | `AspectRatioValue \| undefined` | See type | no | — | Width divided by height, or a `"w / h"` string. Zero, negative or unreadable ratios fall back to 1. Default 1. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
