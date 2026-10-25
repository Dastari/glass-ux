# GeoMap

A MapLibre map of status points, framed on a home region, with clustered markers coloured by
worst status, hover and pinned popups, keyboard navigation between markers and an optional
list view in the same box. It shows the region silhouette while loading.

`import { GeoMap } from "glass-ux/map"`

[Live examples](https://dastari.github.io/glass-ux/components/geo-map)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| config | `MapConfig` | See type | yes | — | Typed component configuration and external provider definitions. |
| defaultSelectedId | `string \| null \| undefined` | See type | no | — | The point selected at first when the selection is uncontrolled. |
| frame | `MapFrame \| undefined` | "points", "home" | no | "home" | Frame the home region (default) or the points. |
| frameKey | `string \| undefined` | See type | no | — | Re-frame when this changes (a new scope, a new home region). |
| home | `MapRegion \| null \| undefined` | See type | yes | — | The home region: undefined while it loads, null when there is none. |
| insets | `MapInsets \| null \| undefined` | See type | no | — | Page chrome floating over a full-bleed map, in CSS pixels (a header above, a status strip below): controls, credits and every frame stay clear of it, and it re-frames when it changes. `null` means "being measured": the silhouette stays transparent until the insets are known, so a server-rendered frame never paints in the wrong place and then jumps (CLS). |
| label | `string` | See type | yes | — | Accessible name of the map: "Sites, All organisations". |
| list | `ReactNode` | See type | no | — | The list view: the caller's table, with a ViewToggle in its toolbar. |
| loading | `boolean \| undefined` | false, true | no | false | The points are still loading: the silhouette stays, markers wait. |
| noun | `MapNoun \| undefined` | See type | no | — | Singular and plural names used in counts and accessible labels. |
| onSelectedIdChange | `((id: string \| null, details: SelectionChangeDetails<MapPoint<T>>) => void) \| undefined` | See type | no | — | Called with the id of the point whose popup the person pins (a click, Enter or Space on its marker, or choosing it from a cluster popup or the off-screen list), and details whose `item` is the point. Hover and focus previews, and pinning the point already selected, do not call it. |
| onViewChange | `((view: "map" \| "list") => void) \| undefined` | See type | no | — | Called with the view the person asks for ("list" or "map") from the view toggle, or "list" from the failure notice when the map cannot start. The toggle shows only when this is set. Pair with `view`. |
| points | `readonly MapPoint<T>[]` | See type | yes | — | Geographical or chart points. |
| pulses | `Readonly<Record<string, number>> \| undefined` | See type | no | — | Per point, a counter that changes when its status changes: the marker pulses once. |
| regions | `readonly MapRegion[] \| undefined` | See type | no | NO_REGIONS | Other regions to outline faintly (the regions that hold points). Defaults to an empty list. |
| renderClusterPopup | `((cluster: MapCluster<T>, context: MapClusterPopupContext) => ReactNode) \| undefined` | See type | no | — | Renders details for an aggregate map cluster. |
| renderPopup | `(point: MapPoint<T>, context: MapPopupContext) => ReactNode` | See type | yes | — | Renders details for an individual map point. |
| selectedId | `string \| null \| undefined` | See type | no | — | The selected point's id, or null for none. Controlled while defined; leave it undefined to use `defaultSelectedId`. |
| statusLabels | `Readonly<Record<"danger" \| "warning" \| "healthy" \| "unknown", string>> \| undefined` | See type | no | — | Display and accessible labels for the supported statuses. |
| view | `"map" \| "list" \| undefined` | "map", "list" | no | "map" | "map" (default) or "list": the list replaces the map in the same box. |
