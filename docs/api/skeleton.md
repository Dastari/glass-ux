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

## Skeleton.Block



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| height | `Length \| undefined` | See type | no | — | Available height used for the component’s size tier. |
| radius | `"full" \| "item" \| "check" \| "control" \| "tile" \| "surface" \| undefined` | "full", "item", "check", "control", "tile", "surface" | no | "control" | A radius role so the placeholder matches the thing it replaces. |
| width | `Length \| undefined` | See type | no | — | Available width or named width tier. |

## Skeleton.Circle



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| size | `Length \| undefined` | See type | no | 32 | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
