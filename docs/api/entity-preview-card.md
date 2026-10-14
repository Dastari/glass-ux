# EntityPreviewCard

The preview card drawn statically, for documentation.

`import { EntityPreviewCard } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-preview-card)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | no | — | The content or component slots rendered inside the component. |
| data | `EntityPreview \| undefined` | See type | no | — | Typed records rendered by the component. |
| entity | `EntityRef` | See type | yes | — | Entity reference supplied by the host. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
