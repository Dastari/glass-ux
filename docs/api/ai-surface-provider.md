# AiSurfaceProvider

Choose the surrounding canvas, panel or floating surface so assistant cards use the appropriate material.

`import { AiSurfaceProvider } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/ai-surface-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| surface | `AiSurface` | "canvas", "panel", "float" | yes | — | Where the cards below are drawn: `canvas` (glass-panel), `panel` (glass-control) or `float` (glass-overlay). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
