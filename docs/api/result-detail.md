# ResultDetail

Key–value facts as DetailTiles in a DetailGrid that reflows with the card.

`import { ResultDetail } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-detail)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "detail"; entity?: import("../types.js").EntityRef; items: import("../types.js").ResultDetailItem[]; }` | See type | yes | — | Typed result, including disclosure and rendering metadata. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
