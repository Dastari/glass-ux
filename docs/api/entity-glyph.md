# EntityGlyph

The glyph of an entity, with its live status dot when it has one.

`import { EntityGlyph } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-glyph)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| entity | `EntityRef` | See type | yes | — | Entity reference supplied by the host. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
