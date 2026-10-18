# ResultBlock

Render any tool result by its type.

`import { ResultBlock } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-block)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `AiResult` | See type | yes | — | The tool result to render; its `type` picks the result component. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
