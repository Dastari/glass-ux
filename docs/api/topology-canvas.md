# TopologyCanvas

A pannable, zoomable tree map: a gateway, its switches and access points, then clients in blocks by kind, with link speeds where known and unknown links dashed.

`import { TopologyCanvas } from "glass-ux/topology"`

[Live examples](https://dastari.github.io/glass-ux/components/topology-canvas)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| clusters | `Readonly<Record<string, TopologyClusterSpec>> \| undefined` | See type | no | — | How cluster keys are named and ordered. |
| describeNode | `((node: TopologyNode<T>) => string) \| undefined` | See type | no | — | The node's accessible name: "Switch ORB-SW-CORE, Online, wired 1 Gbps to FA-GW01". Default: its label. |
| emptyText | `ReactNode` | false, true | no | "Nothing to draw" | One line for an empty map (R2.5). |
| frameKey | `unknown` | See type | no | — | Re-fit when this changes (another network). Live changes to the same map keep the camera. |
| insets | `TopologyInsets \| null \| undefined` | See type | no | — | Page chrome floating over a full-bleed canvas, in CSS pixels (useBleed): fitting, the controls, the minimap and the way to a focused node stay clear of it, and an untouched camera re-fits when it changes. `null` means "being measured": the canvas holds its loading shape and its first frame back until it is known, so nothing jumps (R9). |
| label | `string` | See type | yes | — | Names the map: "Network map, Office LAN". |
| list | `ReactNode` | false, true | no | — | The list view's content: a DataTable of the same nodes, with TopologyViewToggle in its toolbar. |
| minimap | `boolean \| undefined` | false, true | no | true | Show the minimap where there is room (the user can turn it off). Default true. |
| nodeMenu | `((node: TopologyNode<T>) => TopologyNodeMenu \| undefined) \| undefined` | See type | no | — | The node's ActionSet for right-click. |
| nodes | `readonly TopologyNode<T>[] \| undefined` | See type | yes | — | undefined while loading: the skeleton shows in the same box. |
| onOpen | `((node: TopologyNode<T>) => void) \| undefined` | See type | no | — | Double-click (and the caller's Open action): the node's page. |
| onSelect | `((id: string \| null) => void) \| undefined` | See type | no | — | Called when select occurs. The callback type specifies its arguments. |
| onViewChange | `((view: TopologyView) => void) \| undefined` | See type | no | — | Called when view change occurs. The callback type specifies its arguments. |
| renderNode | `(node: TopologyNode<T>) => ReactNode` | See type | yes | — | The node's tile (an identity's icon tier). Keep it stable (useCallback). |
| selectedId | `string \| null \| undefined` | See type | no | null | Stable identifier of the selected item. |
| view | `TopologyView \| undefined` | "map", "list" | no | "map" | Currently selected presentation view. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
