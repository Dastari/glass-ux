# NotificationPopover

A NotificationList in a fixed-size popover for the shell. It holds the list's box through
loading, empty and full, and every row shows each time it opens. Give AccountButton or
Rail.Item the host's unread count: this component changes neither.

`import { NotificationPopover } from "glass-ux/notification-list"`

[Live examples](https://dastari.github.io/glass-ux/components/notification-popover)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `import("@base-ui/react/internals/useAnchorPositioning").Align \| undefined` | "center", "start", "end" | no | "end" | Alignment of the overlay relative to its anchor. |
| anchor | `Element \| import("@floating-ui/dom").VirtualElement \| import("react").RefObject<Element \| null> \| (() => Element \| import("@floating-ui/dom").VirtualElement \| null) \| null \| undefined` | See type | no | — | Anchor used to position floating content. |
| defaultFilter | `string \| undefined` | See type | no | — | The chosen filter at first when uncontrolled. Default the first. |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Whether it starts open when uncontrolled. |
| emptyLabel | `string \| undefined` | See type | no | — | The empty line. Default "No notifications". |
| error | `ReactNode` | See type | no | — | Why the list failed, shown in its box. Default a factual line. Pass `true` for that line. |
| filter | `string \| undefined` | See type | no | — | The chosen filter's id, controlled. |
| filtering | `"client" \| "host" \| undefined` | "client", "host" | no | — | `client` filters the loaded rows; `host` shows `items` as given, for a list paged on the server (R16.7). Default `client`. |
| filters | `false \| readonly NotificationFilter[] \| undefined` | See type | no | — | Choices in the filter, or `false` for no filter. Default All and Unread. |
| finalFocus | `boolean \| import("react").RefObject<HTMLElement \| null> \| ((closeType: import("@base-ui/utils/useEnhancedClickHandler").InteractionType) => void \| boolean \| HTMLElement \| null) \| undefined` | See type | no | — | Where focus returns on close. Default the trigger; pass the opener when there is none. |
| groupBy | `NotificationGrouping \| undefined` | "none", "host", "day" | no | — | How rows are grouped. Default `day`. |
| hasMore | `boolean \| undefined` | false, true | no | — | More rows exist. The list calls `onLoadMore` when its end comes into view, and shows a button there. |
| holdNew | `boolean \| undefined` | false, true | no | — | New rows wait behind a count until asked for, so nothing moves under the pointer (R17.3). `false` shows them at once. Default true. |
| items | `readonly import("./notification-list.js").NotificationItem[] \| undefined` | See type | yes | — | The rows. The host keeps them: the list leaves the page while the popover is closed. |
| loading | `boolean \| undefined` | false, true | no | — | First load, or a whole list being replaced: skeleton rows in the list's box, and nothing is held. |
| loadingMore | `boolean \| undefined` | false, true | no | — | The next page is on its way. |
| loadingRows | `number \| undefined` | See type | no | — | Skeleton rows to draw. Default 5. |
| loadMoreError | `ReactNode` | See type | no | — | The next page failed. Its place shows this and Retry, which calls `onLoadMore`. Default a factual line. Pass `true` for that line. |
| onAction | `((item: NotificationItem) => void) \| undefined` | See type | no | — | Called for an item's own `action`. |
| onDismiss | `((item: NotificationItem) => void) \| undefined` | See type | no | — | Called when a row is dismissed. Without it there is no dismiss control. |
| onFilterChange | `((filter: string) => void) \| undefined` | See type | no | — | Called with the chosen filter's id. |
| onLoadMore | `(() => void) \| undefined` | See type | no | — | Called for the next page. |
| onMarkAllRead | `(() => void) \| undefined` | See type | no | — | Called for Mark all read, which may reach rows not loaded. Without it there is no such control. |
| onOpen | `((item: NotificationItem, event: MouseEvent) => void) \| undefined` | See type | no | — | Called when a row is opened. Makes rows without `href` a button; with `href`, call `preventDefault` to route. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the next open state. |
| onReadChange | `((ids: readonly string[], read: boolean) => void) \| undefined` | See type | no | — | Called when rows are marked read or unread, opening one included. Without it there is no read control. |
| onRetry | `(() => void) \| undefined` | See type | no | — | Offers Retry after `error`, and calls it. |
| open | `boolean \| undefined` | false, true | no | — | Whether it is open, controlled. |
| side | `import("@base-ui/react/internals/useAnchorPositioning").Side \| undefined` | "top", "bottom", "left", "right", "inline-end", "inline-start" | no | — | Preferred side of the anchor; collision handling may choose another side. |
| trigger | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | The element that opens it. Omit it and pass `anchor` when something else opens it, such as a menu item or a rail item. |
| unreadCount | `number \| undefined` | See type | no | — | Unread rows everywhere, loaded or not. Mark all read stays available while this is above zero. Default: counted from the rows. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
