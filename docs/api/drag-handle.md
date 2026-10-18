# DragHandle

A grip that starts its Draggable's drag, for items whose content is interactive or that
should not lift from anywhere. It is the keyboard control (Space or Enter lifts) and, on
touch, drags at once without a long press.

`import { DragHandle } from "glass-ux/drag-drop"`

[Live examples](https://dastari.github.io/glass-ux/components/drag-handle)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | The handle's accessible name. Default "Move <label>". |
| children | `ReactNode` | See type | no | — | The glyph. Default the grip icon. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
