# ResultFiles

Files the agent produced (GlassUxAiShareFile) or collected, ready to download.

`import { ResultFiles } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-files)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "files"; files: ResultFile[]; }` | See type | yes | — | Typed result, including disclosure and rendering metadata. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
