# MessageBlocks

An assistant message's blocks in order: reasoning, tool activity, prose, results, asks,
notices and sources. Prose and most cards fill the reading column; tables, charts, images,
diffs, logs and metrics break out wider (data-breakout). The streaming caret follows the
last prose block of a streaming message.

`import { MessageBlocks } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/message-blocks)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| message | `AiMessage` | See type | yes | — | The assistant message whose `blocks` render in order; a `streaming` state puts the caret after its last prose block. |
