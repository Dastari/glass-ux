# AttachmentChip

An attachment in the composer: type glyph, name, size or upload progress, remove.

`import { AttachmentChip } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/attachment-chip)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| attachment | `AiAttachment` | See type | yes | — | The attachment identifier, label, media type and availability. |
| onRemove | `(() => void) \| undefined` | See type | no | — | Event callback; the typed signature specifies its arguments. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
