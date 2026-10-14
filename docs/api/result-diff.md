# ResultDiff

A change preview — config, registry or policy — as a unified diff: removed lines on the
danger tint, added lines on the success tint, the sign in the gutter so the change reads
without colour too. The target is a context chip; the counts are the data line.

`import { ResultDiff } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-diff)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "diff"; target?: import("../types.js").EntityRef; language?: string; lines: import("../types.js").DiffLine[]; }` | See type | yes | — | Typed result, including disclosure and rendering metadata. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
