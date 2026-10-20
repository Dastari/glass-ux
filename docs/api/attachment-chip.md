# AttachmentChip

An attachment in the composer: type glyph, name, size or upload progress, remove.

`import { AttachmentChip } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/attachment-chip)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| attachment | `AiAttachment` | See type | yes | — | The attachment identifier, label, media type and availability. |
| onRemove | `(() => void) \| undefined` | See type | no | — | Called when the remove button is pressed; without it the chip has no remove button. |
