# ResultTable

A table result: the first rows inline in the AI table style, columns stepping away by
priority as the card narrows, and rows becoming a compact list in very narrow cards.
"Show all 1,284" opens the full DataTable in a window.

`import { ResultTable } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-table)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "table"; columns: ResultColumn[]; rows: ResultRow[]; total: number; noun?: { one: string; other: string; }; }` | See type | yes | — | Typed result, including disclosure and rendering metadata. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
