# NotificationList

`glass-ux/notification-list` ·
[Live component catalogue](https://dastari.github.io/glass-ux/components/notification-list)

What lists the notifications behind the top bar's unread count. The host supplies rows and
callbacks, and the list holds no knowledge of what a notification is about.

```tsx
import { NotificationList } from "glass-ux/notification-list"

<div style={{ height: "30rem" }}>
  <NotificationList
    items={items}
    onOpen={(item) => navigate(item.href)}
    onReadChange={(ids, read) => api.markRead(ids, read)}
    onMarkAllRead={() => api.markAllRead()}
    onDismiss={(item) => api.dismiss(item.id)}
    onAction={(item) => run(item)}
    hasMore={page.more}
    onLoadMore={loadNextPage}
    loadingMore={fetching}
    loadMoreError={failed}
  />
</div>
```

- **It fills its box.** Give the parent a height. Loading, empty and error states use the same box.
- **A control exists only with its callback.** Without `onReadChange` there is no read control.
  Without `onMarkAllRead` or `onDismiss` there is no such control. `item.action` shows when the
  host passes `onAction`, or gives the action an `href`.
- **Opening a row marks it read** through `onReadChange`.
- **Unread** is a dot, a heavier title and "Unread:" at the start of the row's accessible name.

## State

`items` is controlled: the host applies what the callbacks report. With `defaultItems` the list
applies read and dismiss itself. `filter` and `defaultFilter` work the same way.

## Groups and filters

`groupBy` is `day` (Today, Yesterday, a weekday, then a date, in the browser's time zone), `host`
(each item's `group`) or `none`. `filters` replaces All and Unread, and `false` removes the filter.

A filter's `matches` keeps rows from those loaded. For a list paged on a server, set
`filtering="host"`, send the filter in `onFilterChange`, set `loading` while the rows change, and
pass `unreadCount` so Mark all read knows about rows not loaded (R16.7).

## Rows that stay put

New rows wait behind a count ("3 new") in a slot the toolbar keeps for it, and are announced
politely (R17.3). The button shows them and moves focus to the first. A page added at the end shows
at once, because it moves nothing. Set `loading` while replacing the whole list, so nothing is held.
`holdNew={false}` shows arrivals at once.

A row marked read under Unread stays until the filter changes, so the row beneath does not jump
under the pointer. The next page loads as the end of the list comes into view, with a button there
for the keyboard and Retry after `loadMoreError`.

## Keyboard

The list is one tab stop (R11.5): ↑ ↓ Home End move between rows, and Tab walks the current row's
controls and then leaves. Dismissing a row moves focus to its neighbour.

## In the shell

`NotificationPopover` is the list in a fixed-size popover. AccountButton and Rail.Item do not
change: pass the host's count to each, and open the popover from where they already lead.

```tsx
import { NotificationPopover } from "glass-ux/notification-list"
import { AccountButton, Rail } from "glass-ux/shell"
import { CountBadge } from "glass-ux/badge"

const account = useRef<HTMLButtonElement>(null)
const [open, setOpen] = useState(false)

// The account menu holds Notifications (R5.2): there is no separate bell.
<Menu.Root>
  <Menu.Trigger render={<AccountButton ref={account} name={name} unread={unread} />} />
  <Menu.Popup align="end">
    <Menu.Item onClick={() => setOpen(true)}>Notifications</Menu.Item>
  </Menu.Popup>
</Menu.Root>
<NotificationPopover items={items} open={open} onOpenChange={setOpen} anchor={account} finalFocus={account} />

// Or a rail item, with its count on the icon.
<Rail.Item ref={rail} icon={<IconBell />} label="Notifications"
  badge={<CountBadge value={unread} max={99} tone="accent" overlay aria-hidden />}
  onClick={() => setOpen((value) => !value)} />
<NotificationPopover items={items} open={open} onOpenChange={setOpen} anchor={rail} finalFocus={rail} side="inline-end" />
```

The list leaves the page while the popover is closed, so the host keeps `items`, and every row
shows each time it opens. For a pane rather than a popover, put `NotificationList` in a
`Sheet` or an inspector.
