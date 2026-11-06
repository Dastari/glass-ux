# ActivityFeed

`glass-ux/activity-feed` ·
[Live component catalogue](https://dastari.github.io/glass-ux/components/activity-feed)

Time-stamped events: a project's recent activity, a version history, a ticket's history. Each
event is a line of content with a relative time that ticks on the shared clock and shows the
exact date in a tooltip. The host supplies the events and their wording.

```tsx
import { ActivityFeed, type ActivityItem } from "glass-ux/activity-feed"
import { Avatar } from "glass-ux/avatar"
import { IconFlag, IconTickets } from "glass-ux/icons"

const history: ActivityItem[] = [
  { id: "opened", content: <>Priya Nair opened the ticket for <strong>HF-PRN-07</strong></>, at: opened, icon: <IconTickets /> },
  {
    id: "report",
    content: <strong>Priya Nair</strong>,
    at: opened,
    icon: <Avatar name="Priya Nair" decorative />,
    detail: <p>No labels since 08:42, the second time this week.</p>,
  },
  { id: "sla", content: "First response due within 1 hour", at: opened },
  { id: "priority", content: <>Routing rules set the priority to <strong>High</strong></>, at: routed, icon: <IconFlag /> },
]

<ActivityFeed aria-label="Ticket history" items={history} variant="timeline" order="oldest" timePlacement="inline" />
```

## Feed and timeline

`variant="feed"` (the default) draws a marker inline before each event. `variant="timeline"` puts
every marker in one column on the reading-start side and joins them with a rail:

- The rail runs through the markers' centres and stops a small gap short of each, from the first
  event to the last. It runs on beside a detail or a branch, whatever their height.
- An event with neither `icon` nor `tone` sits on the rail as a node. A `tone` without an icon is
  a status dot; tones mean status (R3.3), so leave them off events that have none.
- The feed sizes its markers (R19.1): icons at the small icon size and avatars at the column's
  width. Pass `decorative` to an `Avatar` whose person the line already names.
- Each marker centres on its event's first line, however far the line wraps.
- `children` are one level of branches, indented so their markers sit under the parent's text,
  with a rail of their own.

The rail follows line weight, density and UI scale, is drawn in `CanvasText` under forced colours,
and uses logical properties throughout, so it sits on the right in a right-to-left page.

## Details

`detail` is drawn under the event's line in the content column: a post's message, an alert's facts,
an attachment. `detailSurface` chooses its surface for the whole feed: `inset` (the default, a well),
`card`, or `none` for content that brings its own Surface or needs none. The surface uses the tile
radius and inset and stops at the reading measure.

In a plain feed a detail may hold links and controls. In a selectable feed it is part of the row's
option, which takes its name from the line and its description from the detail. ARIA does not let
an option contain links or controls, so a selectable feed's details hold text only; put actions
beside the feed, for the selected event.

## Order and time

`order` sorts by `at`: `newest` or `oldest` first. The default, `given`, keeps the array's order.
The sort is stable, so events at the same time keep their given order; branches stay under their
parent and are sorted among themselves; events whose `at` does not parse go last.

`timePlacement="inline"` puts the time after the event's sentence, behind a middle dot
("… set the priority to High · 2 min ago"); `end` (the default) puts it at the end of the line. The
dot is drawn, not read: a screen reader hears the sentence, then the time, and the time's element
carries its exact date. In a timeline or inline, the time keeps the width of its longer forms, so
the clock's ticks do not re-wrap a line and move the rows below it.

## Live events

Arrivals must not move what the person is looking at (R17.3). With `order="oldest"`, a new event
joins the end and nothing above it moves. With `newest`, a new event would push every row down:
hold arrivals behind a count, as NotificationList does, or add them when the person asks.

`isNew` on an event marks it as arrived: a wash and an edge bar behind the row, and "New:" read
before its content. Both are positioned behind the row, so setting or clearing the flag moves no
row or control, and the host clears it when the event has been seen. The highlight settles once
when the row gets the mark and does not run under Still or reduced motion. On a plain row the wash
covers its detail and branches, and reaches a little past the text, so leave a small inset around
a feed in a clipping container.

## Selection

`selectedId`, `defaultSelectedId` or `onSelectedIdChange` make the feed a listbox with one tab stop
(R11.5): ↑ ↓ Home End move, through branches, and a click, Enter or Space selects. Selection does not
follow focus. Without them the feed stays an ordinary list.
