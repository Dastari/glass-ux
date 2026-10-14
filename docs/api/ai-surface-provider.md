# AiSurfaceProvider

Choose the surrounding canvas, panel or floating surface so assistant cards use the appropriate material.

`import { AiSurfaceProvider } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/ai-surface-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| surface | `AiSurface` | "canvas", "panel", "float" | yes | — | Rendering context, such as a page, card or docked pane. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
