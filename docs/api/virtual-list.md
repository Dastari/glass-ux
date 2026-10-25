# VirtualList

Render large collections in a bounded container or inside ScrollArea. Only visible rows,
overscan and the currently focused row stay mounted. Give the parent a definite height.
Listbox mode uses roving focus; selection follows activation rather than scrolling.

`import { VirtualList } from "glass-ux/virtual-list"`

[Live examples](https://dastari.github.io/glass-ux/components/virtual-list)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultSelectedKey | `Key \| null \| undefined` | See type | no | null | Initial single selection in listbox mode. |
| empty | `ReactNode` | See type | no | — | Content shown when there are no items and no loading row. |
| endReachedThreshold | `number \| undefined` | See type | no | 5 | Number of remaining rows that triggers onEndReached; defaults to 5. |
| estimateSize | `number \| ((item: T, index: number) => number)` | See type | yes | — | Initial row height in CSS pixels, or a function of item and index. Rows are measured after rendering. |
| getKey | `(item: T, index: number) => Key` | See type | yes | — | Stable identity for focus retention and React reconciliation. |
| items | `readonly T[]` | See type | yes | — | Loaded items, in display order. |
| loading | `ReactNode` | See type | no | — | Loading row after the items. While present, onEndReached is paused. |
| onEndReached | `(() => void) \| undefined` | See type | no | — | Called once for each loaded end identity when the visible range approaches it. |
| onSelectedKeyChange | `((key: Key \| null) => void) \| undefined` | See type | no | — | Called when a listbox option is selected with pointer, Enter or Space. |
| overscan | `number \| undefined` | See type | no | 5 | Extra rows rendered beyond each edge; defaults to 5. |
| ref | `Ref<VirtualListHandle> \| undefined` | See type | no | — | Receives scrollToIndex. |
| renderItem | `(item: T, index: number) => ReactNode` | See type | yes | — | Row content. List mode may contain interactive controls; listbox mode should contain presentation content only. |
| role | `"list" \| "listbox" \| undefined` | "list", "listbox" | no | "list" | List semantics by default; listbox adds single selection and arrow/Home/End navigation. |
| selectedKey | `Key \| null \| undefined` | See type | no | — | Controlled single selection in listbox mode. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |

Also accepts the element’s standard HTML attributes and React DOM events.
