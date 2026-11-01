import { useMemo, useRef, useState } from "react"
import { IconBell, IconFolder, IconSearch } from "../../icons/generated/icons.js"
import { AccountButton, Rail } from "../../shell/index.js"
import { CountBadge } from "../../ui/badge/index.js"
import { Button } from "../../ui/button/index.js"
import { Menu } from "../../ui/menu/index.js"
import { NotificationList, NotificationPopover, type NotificationItem } from "../../ui/notification-list/index.js"
import { HOUR, olderNotifications, sampleNotifications } from "../fixtures/collaboration.js"
import { SectionPage, Specimen } from "../kit.js"

/** A host in miniature: it keeps the rows and applies what the list reports. */
function useNotifications() {
  const [now] = useState(() => Date.now())
  const [items, setItems] = useState<readonly NotificationItem[]>(() => sampleNotifications(now))
  const markRead = (ids: readonly string[], read: boolean) => setItems((rows) => rows.map((row) => (ids.includes(row.id) ? { ...row, read } : row)))
  return {
    now,
    items,
    setItems,
    markRead,
    markAllRead: () => setItems((rows) => rows.map((row) => ({ ...row, read: true }))),
    dismiss: (item: NotificationItem) => setItems((rows) => rows.filter((row) => row.id !== item.id)),
    unread: items.filter((item) => !item.read).length,
  }
}

function FullList() {
  const host = useNotifications()
  const [log, setLog] = useState("No action yet")
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadFails, setLoadFails] = useState(false)
  const [failed, setFailed] = useState(false)
  const [page, setPage] = useState(0)
  const arrivals = useRef(0)
  const deliver = () => {
    arrivals.current += 1
    const id = `arrival-${arrivals.current}`
    host.setItems((rows) => [{ id, title: `Avery Quinn replied to thread ${arrivals.current}`, at: Date.now(), group: "Mentions" }, ...rows])
  }
  const loadMore = () => {
    setLoadingMore(true)
    setFailed(false)
    setTimeout(() => {
      setLoadingMore(false)
      if (loadFails) {
        setFailed(true)
        setLoadFails(false)
        return
      }
      host.setItems((rows) => [...rows, ...olderNotifications(host.now, page)])
      setPage((value) => value + 1)
    }, 300)
  }
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={deliver}>
          Deliver a notification
        </Button>
        <Button size="sm" onClick={() => setLoadFails(true)} disabled={loadFails}>
          Fail the next page
        </Button>
      </div>
      <div className="h-112" data-testid="notifications-full">
        <NotificationList
          items={host.items}
          onOpen={(item) => setLog(`Opened ${item.id}`)}
          onReadChange={host.markRead}
          onMarkAllRead={host.markAllRead}
          onDismiss={host.dismiss}
          onAction={(item) => setLog(`${item.action?.label} on ${item.id}`)}
          hasMore={page < 3}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
          loadMoreError={failed}
        />
      </div>
      <p data-testid="notifications-log">{log}</p>
    </div>
  )
}

function HostGroups() {
  const [now] = useState(() => Date.now())
  const items = useMemo(() => sampleNotifications(now), [now])
  return (
    <div className="h-96 w-full max-w-xl" data-testid="notifications-groups">
      <NotificationList
        aria-label="Notifications by source"
        defaultItems={items}
        groupBy="host"
        filters={[
          { id: "all", label: "All" },
          { id: "mentions", label: "Mentions", matches: (item) => item.group === "Mentions" },
        ]}
        onReadChange={() => undefined}
      />
    </div>
  )
}

function States() {
  const [retried, setRetried] = useState(0)
  return (
    <div className="grid w-full gap-4 md:grid-cols-3">
      <div className="h-72" data-testid="notifications-loading">
        <NotificationList aria-label="Loading example" items={[]} loading />
      </div>
      <div className="h-72" data-testid="notifications-empty">
        <NotificationList aria-label="Empty example" items={[]} />
      </div>
      <div className="h-72" data-testid="notifications-error">
        <NotificationList aria-label="Error example" items={[]} error onRetry={() => setRetried((count) => count + 1)} />
        <output className="sr-only">{retried}</output>
      </div>
    </div>
  )
}

function InTheShell() {
  const host = useNotifications()
  const [fromAccount, setFromAccount] = useState(false)
  const [fromRail, setFromRail] = useState(false)
  const accountRef = useRef<HTMLButtonElement>(null)
  const railRef = useRef<HTMLButtonElement>(null)
  const list = { items: host.items, onReadChange: host.markRead, onMarkAllRead: host.markAllRead, onDismiss: host.dismiss, onOpen: () => undefined }
  return (
    <div className="flex w-full flex-wrap items-start gap-8">
      <Menu.Root>
        <Menu.Trigger render={<AccountButton ref={accountRef} name="Avery Quinn" email="avery.quinn@orbit.example" unread={host.unread} />} />
        <Menu.Popup align="end">
          <Menu.Item onClick={() => setFromAccount(true)}>Notifications</Menu.Item>
          <Menu.Item>Profile and preferences</Menu.Item>
          <Menu.Separator />
          <Menu.Item>Sign out</Menu.Item>
        </Menu.Popup>
      </Menu.Root>
      <NotificationPopover {...list} open={fromAccount} onOpenChange={setFromAccount} anchor={accountRef} finalFocus={accountRef} />
      <Rail.Root aria-label="Main (specimen)">
        <Rail.Item icon={<IconFolder />} label="Projects" />
        <Rail.Item icon={<IconSearch />} label="Search" />
        <Rail.Item
          ref={railRef}
          icon={<IconBell />}
          label="Notifications"
          badge={host.unread ? <CountBadge value={host.unread} max={99} tone="accent" overlay aria-hidden /> : undefined}
          onClick={() => setFromRail((open) => !open)}
        />
      </Rail.Root>
      <NotificationPopover {...list} open={fromRail} onOpenChange={setFromRail} anchor={railRef} finalFocus={railRef} side="inline-end" align="end" />
    </div>
  )
}

function WithTrigger() {
  const host = useNotifications()
  return (
    <div className="flex">
      <NotificationPopover
        items={host.items}
        onReadChange={host.markRead}
        onMarkAllRead={host.markAllRead}
        onDismiss={host.dismiss}
        trigger={<Button icon={<IconBell />}>Notifications</Button>}
      />
    </div>
  )
}

function Paging() {
  const [now] = useState(() => Date.now())
  const items = useMemo(
    () => Array.from({ length: 24 }, (_, index) => ({ id: `row-${index}`, title: `Comment ${index + 1} on Floor plan`, at: now - index * HOUR, read: index > 3 })),
    [now],
  )
  return (
    <div className="h-80 w-full max-w-md" data-testid="notifications-scroll">
      <NotificationList aria-label="Long list" items={items} groupBy="none" filters={false} holdNew={false} onReadChange={() => undefined} onDismiss={() => undefined} />
    </div>
  )
}

export default function NotificationListSection() {
  return (
    <SectionPage>
      <Specimen
        title="Grouped by day"
        description="↑ ↓ Home End move between rows, and Tab walks a row's controls. New rows wait behind a count, and the next page loads as the end comes into view."
        layout="stack"
      >
        <FullList />
      </Specimen>
      <Specimen title="Host groups and filters" description="The host names the groups and the filters. This list holds its rows itself." layout="stack">
        <HostGroups />
      </Specimen>
      <Specimen title="Loading, empty and error" description="Each state fills the list's box." layout="stack" wide>
        <States />
      </Specimen>
      <Specimen title="In a popover" description="A fixed box for the shell. The list mounts on opening, so every row shows." layout="stack">
        <WithTrigger />
      </Specimen>
      <Specimen
        title="With AccountButton and the rail"
        description="The host passes its unread count to each, and opens the popover from a menu item or a rail item. Neither component changes."
        layout="stack"
        wide
      >
        <InTheShell />
      </Specimen>
      <Specimen title="A long list" description="Rows scroll inside the box, with a hairline at an edge while content continues." layout="stack">
        <Paging />
      </Specimen>
    </SectionPage>
  )
}
