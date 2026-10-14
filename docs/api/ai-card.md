# AiCard

A composable assistant card with header, body and footer slots. Its material follows the surrounding AiSurfaceProvider.

`import { AiCard } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/ai-card)

## AiCard.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| breakout | `boolean \| undefined` | false, true | no | false | A wide block (tables, charts, code, images): in a conversation it may break out wider than the text (R5.4). |
| tone | `AiCardTone \| undefined` | "danger", "warning", "default", "success", "accent", "info" | no | "default" | The semantic tone. Use danger and warning for consequences and states. |
| well | `boolean \| undefined` | false, true | no | false | A recessed well inside panels (code, logs, JSON) instead of a raised card. On the canvas every card is a glass layer. |

## AiCard.Header



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ReactNode` | false, true | no | — | Trailing ghost actions: copy, export, open in window. |
| icon | `ReactNode` | false, true | no | — | A glyph before the title. Pass it without a size. |
| iconTile | `boolean \| undefined` | false, true | no | false | Put the icon in a toned tile (asks, entity cards). |
| level | `2 \| 3 \| 4 \| 5 \| 6 \| undefined` | 2, 3, 4, 5, 6 | no | 3 | Heading level inside the conversation outline. |
| meta | `ReactNode` | false, true | no | — | Data only (R2.2): row count, source, target. |
| title | `ReactNode` | false, true | yes | — | The heading or title content. |

## AiCard.Body



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| flush | `boolean \| undefined` | false, true | no | false | No inset: tables, images and code bring their own. |

## AiCard.Footer



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
