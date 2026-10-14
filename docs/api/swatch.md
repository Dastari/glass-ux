# Swatch

The swatch alone: identity is a coloured mark beside text, never coloured text.

`import { Swatch } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/swatch)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| hidden | `boolean \| undefined` | false, true | no | false | Keeps the item out of the visible layout. |
| shape | `SwatchShape \| undefined` | "line", "dot", "box" | no | "box" | Named shape of the control or marker. |
| slot | `number \| undefined` | See type | no | — | Named content slot. |
| tone | `string \| undefined` | See type | no | — | The semantic tone. Use danger and warning for consequences and states. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
