# TopologyViewToggle

"View as list" / "View as map": in the map's controls, and in the list's toolbar.

`import { TopologyViewToggle } from "glass-ux/topology"`

[Live examples](https://dastari.github.io/glass-ux/components/topology-view-toggle)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| onViewChange | `(view: TopologyView) => void` | See type | yes | — | Called with the view the person switches to. |
| size | `"sm" \| "md" \| undefined` | "sm", "md" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| view | `TopologyView` | "map", "list" | yes | — | The view currently shown; the button offers the other one (an icon button on the map, "View as map" in the list). |
