# ResultFiles

Files the agent produced (GlassUxAiShareFile) or collected, ready to download.

`import { ResultFiles } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-files)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "files"; files: ResultFile[]; }` | See type | yes | — | The files result: each of its `files` becomes a FileRowItem, and the count is the data line. |
