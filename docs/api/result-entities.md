# ResultEntities

A list of entities as compact rows: glyph with status, name (a context link), a data
detail, the state, and the row ⋯ menu — with the same menu on right-click (R11.6).

`import { ResultEntities } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-entities)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "entities"; entities: Array<import("../types.js").EntityRef & { detail?: string; }>; total?: number; }` | See type | yes | — | Typed result, including disclosure and rendering metadata. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
