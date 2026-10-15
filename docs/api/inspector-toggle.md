# InspectorToggle

Shows or hides the inspector pane: in Glass UX, the assistant for the current context. It is
pressed while the pane is open. Renders nothing when the page has no inspector.

`import { InspectorToggle } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/inspector-toggle)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| icon | `ReactNode` | See type | no | — | The pane's mark (the product's AI mark). Default: the inspector glyph. |
| label | `string \| undefined` | See type | no | — | Its name and tooltip: "Assistant here". Default: "Show inspector" / "Hide inspector". |
| shortcut | `string \| undefined` | See type | no | — | Toggles from anywhere ("mod+."); shown in the tooltip. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
