# Skeleton

Loading placeholders for text, blocks, avatars and compound content that preserve the loaded layout.

`import { Skeleton } from "glass-ux/skeleton"`

[Live examples](https://dastari.github.io/glass-ux/components/skeleton)

## Skeleton.Text



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| lines | `number \| undefined` | See type | no | 1 | Number of text or skeleton lines. |
| type | `SkeletonTextRole \| undefined` | "body", "caption", "label", "title", "display", "mono", "headline", "subtitle", "overline" | no | "body" | The type role being replaced (`type-*`); the skeleton takes exactly its line box. |
| width | `Length \| undefined` | See type | no | — | Width of the (last) line. Earlier lines of a multi-line block are full width. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.

## Skeleton.Block



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| height | `Length \| undefined` | See type | no | — | Available height used for the component’s size tier. |
| radius | `"full" \| "item" \| "check" \| "control" \| "tile" \| "surface" \| undefined` | "full", "item", "check", "control", "tile", "surface" | no | "control" | A radius role so the placeholder matches the thing it replaces. |
| width | `Length \| undefined` | See type | no | — | Available width or named width tier. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.

## Skeleton.Circle



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| size | `Length \| undefined` | See type | no | 32 | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLSpanElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
