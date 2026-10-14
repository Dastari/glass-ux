# ResultJson

The last resort: the preview as a JSON tree.

`import { ResultJson } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/result-json)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| result | `ResultBase & { type: "json"; value: unknown; truncated?: boolean; }` | See type | yes | — | Typed result, including disclosure and rendering metadata. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
