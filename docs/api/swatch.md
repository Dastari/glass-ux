# Swatch

The swatch alone: identity is a coloured mark beside text, never coloured text.

`import { Swatch } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/swatch)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| hidden | `boolean \| undefined` | false, true | no | false | Shows the swatch as switched off (its series is hidden); defaults to false. |
| shape | `SwatchShape \| undefined` | "line", "dot", "box" | no | "box" | Mark shape to mirror; defaults to "box". |
| slot | `number \| undefined` | See type | no | — | Categorical slot 1–8; defaults to 1. Ignored when `tone` is set. |
| tone | `string \| undefined` | See type | no | — | The semantic tone. Use danger and warning for consequences and states. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
