# WindowContentHost

Loads and renders a window's body. Shows a skeleton in the body's box while loading.

`import { WindowContentHost } from "glass-ux/windows"`

[Live examples](https://dastari.github.io/glass-ux/components/window-content-host)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| id | `string` | See type | yes | — | A stable element or component identifier. |
| kind | `string` | See type | yes | — | Semantic entity or content kind, used to choose labels and rendering. |
| params | `Readonly<Record<string, string \| number \| boolean>>` | See type | yes | — | Serialisable parameters used to reconstruct the view. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
