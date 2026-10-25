# Virtual list

`glass-ux/virtual-list` renders measured rows with `@tanstack/react-virtual`. Give its parent
a definite height. It scrolls within that box, or uses the enclosing `ScrollArea` viewport.

```tsx
import { VirtualList } from "glass-ux/virtual-list";

<VirtualList
  items={records}
  getKey={record => record.id}
  estimateSize={40}
  renderItem={record => <button type="button">{record.label}</button>}
  aria-label="Records"
  overscan={5}
  onEndReached={loadMore}
  endReachedThreshold={10}
  loading={loading ? <Spinner label="Loading records" /> : null}
  empty="No records"
/>
```

Keys must stay stable when items move or new pages arrive. The visible rows and overscan
are mounted, together with the focused row: scrolling never unmounts a focused control.
`estimateSize` accepts a number or `(item, index) => number` in CSS pixels; rendered rows
are measured. Keep estimates near the expected height. The `ref` exposes
`scrollToIndex(index, { align, behavior })`; indices are zero-based and clamped. Smooth
scrolling is unsuitable for rows whose measurements change while scrolling.

`onEndReached` runs once per loaded end identity (length and last key), when the visible
end comes within `endReachedThreshold` rows. A loading slot pauses the callback. Omit
the callback once the collection is complete; append results in application state. For an
initially empty collection, start the first load in the application.

The default `list`/`listitem` roles allow interactive row content. `role="listbox"` supplies
single selection with `selectedKey`, `defaultSelectedKey` and `onSelectedKeyChange`.
Arrow keys, Home and End move focus; Enter, Space and pointer activation select. Supply
an accessible name and presentation-only option content, without nested controls. Position
and set size are announced for virtual rows. Use `Combobox` when selection needs search
or typeahead.
