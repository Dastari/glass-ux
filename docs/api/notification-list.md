# NotificationList

Notifications from the host, grouped by day or by the host's groups. Unread rows carry a dot,
a heavier title and "Unread:" at the start of their accessible name. Mark read, Mark all read,
dismiss and each item's action exist only when the host supplies their callback.

The list is one tab stop (R11.5): ↑ ↓ Home End move between rows, and Tab walks the current
row's controls. New rows wait behind a count at the top (R17.3), announced politely, and rows
marked read stay under an Unread filter until it changes, so nothing moves under the pointer.
It fills its box: give the parent a height. The host owns every read, write and subscription.

`import { NotificationList } from "glass-ux/notification-list"`

[Live examples](https://dastari.github.io/glass-ux/components/notification-list)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultFilter | `string \| undefined` | See type | no | — | The chosen filter at first when uncontrolled. Default the first. |
| defaultItems | `readonly NotificationItem[] \| undefined` | See type | no | [] | The rows at first when uncontrolled. The list then applies read and dismiss itself. |
| emptyLabel | `string \| undefined` | See type | no | — | The empty line. Default "No notifications". |
| error | `ReactNode` | See type | no | — | Why the list failed, shown in its box. Default a factual line. Pass `true` for that line. |
| filter | `string \| undefined` | See type | no | — | The chosen filter's id, controlled. |
| filtering | `"client" \| "host" \| undefined` | "client", "host" | no | "client" | `client` filters the loaded rows; `host` shows `items` as given, for a list paged on the server (R16.7). Default `client`. |
| filters | `false \| readonly NotificationFilter[] \| undefined` | See type | no | — | Choices in the filter, or `false` for no filter. Default All and Unread. |
| groupBy | `NotificationGrouping \| undefined` | "none", "host", "day" | no | "day" | How rows are grouped. Default `day`. |
| hasMore | `boolean \| undefined` | false, true | no | false | More rows exist. The list calls `onLoadMore` when its end comes into view, and shows a button there. |
| holdNew | `boolean \| undefined` | false, true | no | true | New rows wait behind a count until asked for, so nothing moves under the pointer (R17.3). `false` shows them at once. Default true. |
| items | `readonly NotificationItem[] \| undefined` | See type | no | — | The rows, controlled, in display order: newest first, as the host keeps them. |
| loading | `boolean \| undefined` | false, true | no | false | First load, or a whole list being replaced: skeleton rows in the list's box, and nothing is held. |
| loadingMore | `boolean \| undefined` | false, true | no | false | The next page is on its way. |
| loadingRows | `number \| undefined` | See type | no | 5 | Skeleton rows to draw. Default 5. |
| loadMoreError | `ReactNode` | See type | no | — | The next page failed. Its place shows this and Retry, which calls `onLoadMore`. Default a factual line. Pass `true` for that line. |
| onAction | `((item: NotificationItem) => void) \| undefined` | See type | no | — | Called for an item's own `action`. |
| onDismiss | `((item: NotificationItem) => void) \| undefined` | See type | no | — | Called when a row is dismissed. Without it there is no dismiss control. |
| onFilterChange | `((filter: string) => void) \| undefined` | See type | no | — | Called with the chosen filter's id. |
| onItemsChange | `((items: readonly NotificationItem[]) => void) \| undefined` | See type | no | — | Called with the next rows after a change the list made itself. |
| onLoadMore | `(() => void) \| undefined` | See type | no | — | Called for the next page. |
| onMarkAllRead | `(() => void) \| undefined` | See type | no | — | Called for Mark all read, which may reach rows not loaded. Without it there is no such control. |
| onOpen | `((item: NotificationItem, event: MouseEvent) => void) \| undefined` | See type | no | — | Called when a row is opened. Makes rows without `href` a button; with `href`, call `preventDefault` to route. |
| onReadChange | `((ids: readonly string[], read: boolean) => void) \| undefined` | See type | no | — | Called when rows are marked read or unread, opening one included. Without it there is no read control. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Offers Retry after `error`, and calls it. |
| unreadCount | `number \| undefined` | See type | no | — | Unread rows everywhere, loaded or not. Mark all read stays available while this is above zero. Default: counted from the rows. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
