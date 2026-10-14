# TopologyViewToggle

"View as list" / "View as map": in the map's controls, and in the list's toolbar.

`import { TopologyViewToggle } from "glass-ux/topology"`

[Live examples](https://dastari.github.io/glass-ux/components/topology-view-toggle)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| onViewChange | `(view: TopologyView) => void` | See type | yes | — | Event callback; the typed signature specifies its arguments. |
| size | `"sm" \| "md" \| undefined` | "sm", "md" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| view | `TopologyView` | "map", "list" | yes | — | Currently selected presentation view. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
