# DragDropProvider

The scope of a drag and drop system. Draggables and drop zones inside it can reach each
other; it owns the drag preview, the polite live region that announces lifts, moves and
drops, and the lifecycle callbacks for every drag in it (`onDragStart` … `onDragEnd`).
Put one around a screen or the whole application; providers do not exchange items.

`import { DragDropProvider } from "glass-ux/drag-drop"`

[Live examples](https://dastari.github.io/glass-ux/components/drag-drop-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| announcements | `Partial<DragDropAnnouncements> \| undefined` | See type | no | — | Replace any of the screen reader messages. |
| autoScroll | `boolean \| undefined` | false, true | no | true | Scroll containers and the page while a pointer drag nears their edges. Default true. |
| children | `ReactNode` | See type | no | — | Everything that drags or takes drops. |
| instructions | `string \| undefined` | See type | no | — | The keyboard instructions every handle is described by. |
| onDragCancel | `((event: DragCancelEvent) => void) \| undefined` | See type | no | — | A drag ended without a drop; `reason` says why. |
| onDragEnd | `((event: DragEndEvent) => void) \| undefined` | See type | no | — | Every drag's last event, after the item settled, with `outcome` "dropped" or "cancelled". |
| onDragMove | `((event: DragMoveEvent) => void) \| undefined` | See type | no | — | The pointer moved during a pointer drag (every frame). Write styles here, never React state. |
| onDragOver | `((event: DragOverEvent) => void) \| undefined` | See type | no | — | The target zone, insertion index or the target's verdict changed. |
| onDragStart | `((event: DragStartEvent) => void) \| undefined` | See type | no | — | An item was lifted: past the pointer threshold, after a touch press, or with Space or Enter. |
| onDrop | `((event: DropEvent) => void) \| undefined` | See type | no | — | An item was dropped on a zone that accepted it, after the zone's own `onDrop`. |
