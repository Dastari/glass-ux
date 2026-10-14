# StatusGlyph

The status glyph shared by tool rows, groups and provider activity.

`import { StatusGlyph } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/status-glyph)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| status | `ToolStatus` | "queued", "cancelled", "failed", "running", "succeeded", "awaiting-approval" | yes | — | Current operation or connection status. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
