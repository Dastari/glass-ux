# ResultSkeleton

The exact box of a result before its data arrives: the same card, header and body shape
(row count, chart height, image ratio), so the result replaces it without moving
anything below (R9.3).

`import { ResultSkeleton } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| count | `number \| undefined` | See type | no | — | Table and list rows; image count. |
| type | `"table" \| "value" \| "log" \| "entity" \| "chart" \| "metrics" \| "detail" \| "entities" \| "images" \| "files" \| "diff" \| "json"` | "table", "value", "log", "entity", "chart", "metrics", "detail", "entities", "images", "files", "diff", "json" | yes | — | Semantic content or control type. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
