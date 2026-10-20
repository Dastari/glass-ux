# Draggable

Any element as a draggable object. Without a DragHandle inside, the whole element is the
handle: it takes focus, lifts with Space or Enter and, on touch, with a short press so the
list still scrolls. Buttons, links and fields inside keep their own behaviour. Inside a
sortable DropZone it is one of the zone's ordered items. While it is dragged it carries
`data-dnd-source` and its place stays reserved; `data-dnd-item` marks it for styling.

`import { Draggable } from "glass-ux/drag-drop"`

[Live examples](https://dastari.github.io/glass-ux/components/draggable)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode \| ((state: DraggableState) => ReactNode)` | See type | no | — | The item's content, or a function of its drag state. |
| data | `T \| undefined` | See type | no | — | The host's object. |
| disabled | `string \| boolean \| undefined` | See type | no | — | Not draggable; a string says why (aria-disabled with the reason as its description). |
| effect | `DragEffect \| undefined` | "copy", "move" | no | — | "copy" leaves the source in place. Default "move". |
| id | `string` | See type | yes | — | Unique within the provider; also the item's id in every event. |
| label | `string` | See type | yes | — | A short name for announcements and the handle's accessible name. |
| onDragEnd | `((event: DragEndEvent<T>) => void) \| undefined` | See type | no | — | This item's drag ended, dropped or cancelled. |
| onDragStart | `((event: DragStartEvent<T>) => void) \| undefined` | See type | no | — | This item was lifted. |
| preview | `ReactNode` | See type | no | — | Content for the drag preview instead of a copy of the element. |
| render | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | The element to render instead of a div (`<li />`, `<article />`). |
| type | `string \| undefined` | See type | no | — | The kind of object, for zone filters. Default "item". |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
