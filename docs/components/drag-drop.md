# Drag and drop

`glass-ux/drag-drop` · [Live component catalogue](https://dastari.github.io/glass-ux/components/drop-zone)

Object-driven drag and drop. A `Draggable` carries one of your objects (`data`) and a `type`;
a `DropZone` decides which types it takes and receives the object, its source and its target
in `onDrop`. Any element can be either: pass `render` (`<li />`, a `Surface`) or use the
`useDraggable` / `useDropZone` hooks on elements you already render. A `DragDropProvider`
scopes the system, owns the drag preview and the live region, and reports every drag's
lifecycle.

```tsx
import { DragDropProvider, Draggable, DropZone, applyDrop, type DropEvent } from "glass-ux/drag-drop";
import { Surface } from "glass-ux/surface";

function Board() {
  const [lists, setLists] = useState({ backlog: [...], done: [...] });
  const drop = (event: DropEvent) => setLists((current) => applyDrop(current, event, (task) => task.id));
  return (
    <DragDropProvider>
      {(["backlog", "done"] as const).map((id) => (
        <DropZone key={id} id={id} label={LABELS[id]} sort="vertical" accept="task" onDrop={drop} render={<ul />}>
          {lists[id].map((task) => (
            <Draggable key={task.id} id={task.id} type="task" data={task} label={task.title}
              render={<Surface as="li" material="card" radius="tile" padding="tile" />}>
              {task.title}
            </Draggable>
          ))}
        </DropZone>
      ))}
    </DragDropProvider>
  );
}
```

## Sortable zones

`sort="vertical" | "horizontal" | "grid"` makes the Draggables inside a zone its ordered items.
When an item is lifted out, the others close its gap; the zone under the item opens a gap of
the item's size where it would land, and a zone gaining an item grows by one slot so its last
item stays inside it. Lists flow items of any size; grids assume uniform cells. On release the
preview settles into the gap, your `onDrop` runs inside `flushSync`, and every item animates
from where it was drawn to where it now lays out. A drop you refuse, or do not apply, slides
back on its own.

`event.source.index` and `event.target.index` are positions in the zone's items; the target
index is the item's index after the move. Apply them with `applyDrop` (lists in one record,
keyed by zone id), `moveItem` (reorder one list) or `insertItem`. Zones without `sort` report
`index: null` and `applyDrop` appends.

A Draggable belongs to its nearest zone. Do not nest sortable zones.

## Filtering and reactive states

| Zone state (`data-drop-state`) | When                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| `idle`                         | nothing is being dragged                                          |
| `ready`                        | the dragged item can be dropped here                              |
| `disabled`                     | `accept` does not take its type, `disabled` is set, or `validate` returned `false` |
| `error`                        | `validate` returned `{ status: "error", reason }`: it would normally fit, but not now |
| `pending`                      | `onDrop` returned a promise that has not settled (`aria-busy`)    |

- **`accept`** is a type, a list of types or a test on the item. A zone always takes back its
  own items. Zones refused by type are transparent to the pointer, so an outer zone that takes
  the item still receives it.
- **`disabled`** refuses everything for now; a string says why.
- **`validate(drag, { index })`** runs at the start of a drag, whenever the zone re-renders
  and, while the item is over the zone, when the index changes. Return `true`, `false` or
  `{ status: "disabled" | "error", reason }`. Because it re-runs on render, a zone that becomes
  full during a drag changes state at once.
- The reason appears under the drag preview while it is over the zone, is announced, and is
  on the zone as `data-drop-reason`. Releasing on a refused zone sends the item home; a
  keyboard drop there stays lifted and repeats the reason.
- **`onDrop` returning `false`** refuses the drop after the fact. A promise shows `pending`;
  a rejection shows `error` for the feedback hold. Reject with `new DropError("reason")` to
  name the problem; your data is yours to restore.

`data-drop-over` marks the zone under the item. The render function form of `children`
receives `{ status, over, reason, item, index }` for content such as "Release to drop".

## Appearance

- **`outline`** (default): zones that take the item show a dashed accent edge; the one under
  it turns solid with an accent tint. Error zones show a danger edge throughout.
- **`fill`**: only the tint under the item.
- **`none`**: no drop chrome at all, for lists whose parting items already show where things
  go, or zones you style yourself from the data attributes.

The edge and tint paint under the zone's content on its `::before`; a zone's `::after` is
used while it grows. Items being dragged carry `data-dnd-source="move"` (their place stays
reserved and empty) or `"copy"`.

## Draggables and handles

- **`effect="copy"`** leaves the source in place, for palettes.
- **`liftKeys`** chooses the keys that lift it (default Space and Enter). Leave Enter out when
  Enter on the handle also opens something, as Scheduler timeline events do.
- **`disabled`** (a string says why) makes the item `aria-disabled` with the reason as its
  description.
- **`preview`** replaces the default copy of the element with your own content. The default
  copy keeps the element's classes and inherited text styles, but not styles that depend on
  its ancestors.
- Without a **`DragHandle`** the whole item is the handle: focusable, with
  `role="button"` and `aria-roledescription="draggable"`. Buttons, links, fields and
  `[data-dnd-ignore]` inside it keep their own behaviour. With a DragHandle only the grip
  starts a drag.
- The click that follows a pointer drag is swallowed, so dropping a card does not open it.

## Input

| Input    | Behaviour                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------- |
| Mouse, pen | Drags after moving 4 px; Escape cancels. Scroll containers and the page scroll near their edges. |
| Touch    | A whole-item handle lifts after a short press, so swiping still scrolls; a DragHandle drags at once. |
| Keyboard | Space or Enter lifts. Arrows move along a list or grid; across the list's axis (or past a grid's edge) they move to the previous or next zone that takes the item. Space or Enter drops, Escape or leaving the handle cancels. |

Lifts, moves, refusals, drops and cancellations are announced in the provider's polite live
region. Replace any message with `announcements`. Drag and drop must not be the only way to
move something (R11.2): offer a menu action too.

## Lifecycle

`DragDropProvider` and `useDragDropMonitor` receive `onDragStart`, `onDragMove` (every frame;
do not set React state there, R18.5), `onDragOver` (target zone, index or verdict changed),
`onDrop`, `onDragCancel` (with `reason`: `escape`, `outside`, `blocked`, `unchanged`, `refused`
or `interrupted`) and `onDragEnd`, which always comes last with `outcome` `"dropped"` or
`"cancelled"`. Zones receive `onDragEnter`, `onDragLeave`, `onDragOver` and `onDrop`;
draggables receive `onDragStart` and `onDragEnd`. `useActiveDrag()` returns the drag in
progress for UI that appears only while dragging.

## Performance

A pointer frame reads no layout and re-renders nothing (R18.5):

- **Cached geometry:** zone rectangles, their clipping and their scroll containers are
  measured at the lift. They are measured again after a scroll, a resize, a zone or item
  changing size, and every 250 ms while the pointer moves. Hit-testing is arithmetic on those
  rectangles.
- **Covers are respected:** a real hit-test confirms the zone whenever the answer changes or
  the pointer has travelled, so menus, sticky headers and overlapping zones still win.
- **Preview in the top layer:** the preview moves with `transform` on its own layer, and the
  lift's scale and shadow sit on an inner layer. Being in the top layer puts it above dialogs
  and outside ancestor transforms.
- **Shield:** during a pointer drag, a transparent top-layer shield owns the cursor and hover,
  so the page under the pointer neither restyles nor hit-tests. It passes the wheel to the
  scroll container under the pointer, chaining outward like the browser.
- **Items** move with `translate` animations and zone states are data attributes.
- **React** hears about a lift, a zone's status change and the end. A `DropZone` re-renders
  only when its children are a render function; with `useDropZone`, pass
  `trackState: false` when nothing reads `state`.

Native HTML5 drag and drop is not used. Its drag image is a bitmap snapshot taken at the
lift, so it could not keep the lift animation, the live reason under the preview, keyboard
dragging or the touch gestures.
