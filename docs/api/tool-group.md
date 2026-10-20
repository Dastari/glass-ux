# ToolGroup

Consecutive tool calls folded into one summary row ("Ran 4 tools · 2.3 s"), with the
running and failed counts when there are any. A single call renders as its own row.

`import { ToolGroup } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/tool-group)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| calls | `AiToolCall[]` | See type | yes | — | Tool calls in execution order. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Opens the uncontrolled overlay initially. |
