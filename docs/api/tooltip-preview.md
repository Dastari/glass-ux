# TooltipPreview

A static tooltip bubble for documentation and screenshots. Same classes, no behaviour.

`import { TooltipPreview } from "glass-ux/tooltip"`

[Live examples](https://dastari.github.io/glass-ux/components/tooltip-preview)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| content | `ReactNode` | See type | yes | — | The bubble's text: a control's name or why it is disabled. |
| shortcut | `string \| undefined` | See type | no | — | A keyboard shortcut drawn after the text in keycaps ("mod+k"). |
| side | `"top" \| "bottom" \| undefined` | "top", "bottom" | no | "top" | Which side of the (imagined) trigger the bubble sits on; the arrow points back at it. Defaults to `"top"`. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
