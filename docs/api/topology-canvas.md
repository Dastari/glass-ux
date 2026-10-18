# TopologyCanvas

A pannable, zoomable network map that lays nodes out as a family tree with clustered blocks,
with arrow-key navigation between nodes, selection, a right-click node menu, a minimap and
an optional list view in the same box. It shows a skeleton while `nodes` is undefined.

Keyboard: the arrow keys move between nodes like a family tree, Enter selects, Space
toggles the selection, Escape clears it, + and − zoom, 0 fits the map, and Shift+F10 opens
the focused node's menu.

`import { TopologyCanvas } from "glass-ux/topology"`

[Live examples](https://dastari.github.io/glass-ux/components/topology-canvas)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| clusters | `Readonly<Record<string, TopologyClusterSpec>> \| undefined` | See type | no | — | How cluster keys are named and ordered. |
| describeNode | `((node: TopologyNode<T>) => string) \| undefined` | See type | no | — | The node's accessible name: "Switch ORB-SW-CORE, Online, wired 1 Gbps to FA-GW01". Default: its label. |
| emptyText | `ReactNode` | See type | no | "Nothing to draw" | One line for an empty map (R2.5). |
| frameKey | `unknown` | See type | no | — | Re-fit when this changes (another network). Live changes to the same map keep the camera. |
| insets | `TopologyInsets \| null \| undefined` | See type | no | — | Page chrome floating over a full-bleed canvas, in CSS pixels (useBleed): fitting, the controls, the minimap and the way to a focused node stay clear of it, and an untouched camera re-fits when it changes. `null` means "being measured": the canvas holds its loading shape and its first frame back until it is known, so nothing jumps (R9). |
| label | `string` | See type | yes | — | Names the map: "Network map, Office LAN". |
| list | `ReactNode` | See type | no | — | The list view's content: a DataTable of the same nodes, with TopologyViewToggle in its toolbar. |
| minimap | `boolean \| undefined` | false, true | no | true | Show the minimap where there is room (the user can turn it off). Default true. |
| nodeMenu | `((node: TopologyNode<T>) => TopologyNodeMenu \| undefined) \| undefined` | See type | no | — | The node's ActionSet for right-click. |
| nodes | `readonly TopologyNode<T>[] \| undefined` | See type | yes | — | undefined while loading: the skeleton shows in the same box. |
| onOpen | `((node: TopologyNode<T>) => void) \| undefined` | See type | no | — | Double-click (and the caller's Open action): the node's page. |
| onSelect | `((id: string \| null) => void) \| undefined` | See type | no | — | Called with the node id the person selects (click, Enter or Space), or `null` to clear: Space on the selected node, Escape, or a click on empty canvas. Pair with `selectedId` to show the selection. |
| onViewChange | `((view: TopologyView) => void) \| undefined` | See type | no | — | Called with the view the person switches to from the view toggle in the map's controls; the toggle shows only when this is set. Pair with `view`. |
| renderNode | `(node: TopologyNode<T>) => ReactNode` | See type | yes | — | The node's tile (an identity's icon tier). Keep it stable (useCallback). |
| selectedId | `string \| null \| undefined` | See type | no | null | Stable identifier of the selected item. |
| view | `TopologyView \| undefined` | "map", "list" | no | "map" | Currently selected presentation view. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
