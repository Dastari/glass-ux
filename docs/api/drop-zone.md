# DropZone

Any element as a place to drop objects. `accept` filters by item type, `validate` and
`disabled` refuse items reactively ("List is full"), and `sort` makes it an ordered list,
row or grid of the Draggables inside it: they part to open a gap where the item would land
and close up when one is lifted out. `onDrop` hands over the object and the source and
target positions; apply it to your data with `applyDrop`, `moveItem` or `insertItem`.

`import { DropZone } from "glass-ux/drag-drop"`

[Live examples](https://dastari.github.io/glass-ux/components/drop-zone)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| accept | `DropAccept \| undefined` | See type | no | — | Item types it takes. Default: every type. A zone always takes back its own items. |
| appearance | `DropZoneAppearance \| undefined` | "none", "fill", "outline" | no | "outline" | outline: a dashed accent edge on zones that take the item, solid with a tint when it is over them, danger for errors. fill: the tint only. none: nothing at all, so the zone does not look like one; style it from `data-drop-state` or the render function instead. |
| children | `ReactNode \| ((state: DropZoneState) => ReactNode)` | See type | no | — | The zone's content, or a function of its state ("Drop to add", the reason). |
| disabled | `string \| boolean \| undefined` | See type | no | — | Refuse every item for now; a string says why. The zone reads as disabled. |
| id | `string` | See type | yes | — | Unique within the provider; the target id in drop events. |
| label | `string` | See type | yes | — | A short name for announcements ("Done column"). |
| onDragEnter | `((event: DragOverEvent<T>) => void) \| undefined` | See type | no | — | The item came over this zone. |
| onDragLeave | `((event: DragOverEvent<T>) => void) \| undefined` | See type | no | — | The item left this zone. |
| onDragOver | `((event: DragOverEvent<T>) => void) \| undefined` | See type | no | — | The index or verdict changed while over this zone. |
| onDrop | `((event: DropEvent<T>) => void \| boolean \| Promise<unknown>) \| undefined` | See type | no | — | The item was dropped here. Apply it to your data synchronously; the zone animates the items to their new places. Return false to refuse (the item goes back), or a promise to show the zone as pending until it settles. A rejected promise shows the zone in error; reject with a `DropError` to say why. Your data is yours to restore. |
| render | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | The element to render instead of a div (`<ul />`, `<section />`). |
| sort | `DropZoneSort \| undefined` | "horizontal", "vertical", "grid" | no | — | Orders the Draggables inside it: they part to open a gap and close up when one leaves. |
| validate | `((drag: DragInfo<T>, target: { index: number \| null; }) => DropVerdict) \| undefined` | See type | no | — | A verdict on the item now and, for sortable zones, the index it is over. Re-evaluated when the zone re-renders. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
