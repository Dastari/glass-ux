# TooltipPreview

A static tooltip bubble for documentation and screenshots. Same classes, no behaviour.

`import { TooltipPreview } from "glass-ux/tooltip"`

[Live examples](https://dastari.github.io/glass-ux/components/tooltip-preview)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| content | `ReactNode` | false, true | yes | — | Content rendered by this slot or overlay. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard shortcut shown with the control, using the host platform’s modifier keys. |
| side | `"top" \| "bottom" \| undefined` | "top", "bottom" | no | "top" | Preferred side of the anchor; collision handling may choose another side. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
