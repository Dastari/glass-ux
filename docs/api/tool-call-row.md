# ToolCallRow

One tool call as a quiet row: status glyph, a human verb ("Queried 1,284 endpoints"),
its targets, and the elapsed time. Status changes in place; a running call shows a thin
indeterminate line under the row. Expanding shows the targets, arguments and a result
preview (copyable JSON). Failures keep their reason visible without expanding.

`import { ToolCallRow } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/tool-call-row)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| call | `AiToolCall` | See type | yes | — | Tool call and its current execution state. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Start expanded (galleries, failures you want seen). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
