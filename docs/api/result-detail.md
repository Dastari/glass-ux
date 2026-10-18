# ResultDetail

Key–value facts as DetailTiles in a DetailGrid that reflows with the card.

`import { ResultDetail } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-detail)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "detail"; entity?: import("../types.js").EntityRef; items: import("../types.js").ResultDetailItem[]; }` | See type | yes | — | The detail result: its `items` become tiles in order; redacted items show the withheld treatment and are left out of Copy. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
