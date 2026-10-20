# EntityPreviewContent

The inside of the preview card: identity, state, three or four facts, primary actions.

`import { EntityPreviewContent } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-preview-content)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `boolean \| undefined` | false, true | no | true | Supporting actions rendered in the action slot. |
| data | `EntityPreview \| undefined` | See type | no | — | Typed records rendered by the component. |
| entity | `EntityRef` | See type | yes | — | Entity reference supplied by the host. |
