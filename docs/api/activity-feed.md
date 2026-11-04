# ActivityFeed

An activity or notification feed using shared relative times and accessible absolute tooltips.

As a timeline, such as a version history or a ticket's history, `variant="timeline"` joins the
markers with a rail; items take a `tone` for the marker, a `detail` under their line and
`children` for one level of branches. Selection makes it a listbox with one tab stop (R11.5):
↑ ↓ Home End move, and a click, Enter or Space selects. Selection does not follow focus,
so moving through a long history loads nothing. A plain feed stays an ordinary list.

`import { ActivityFeed } from "glass-ux/activity-feed"`

[Live examples](https://dastari.github.io/glass-ux/components/activity-feed)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultSelectedId | `string \| null \| undefined` | See type | no | — | The event selected at first when uncontrolled. |
| detailSurface | `ActivityDetailSurface \| undefined` | "none", "inset", "card" | no | "inset" | The surface under each event's `detail`: `inset` (the default), a well like a code block's; `card`, the card material; or `none`, for content that brings its own surface or none. |
| empty | `string \| undefined` | See type | no | — | One factual line when there are no events. |
| items | `readonly ActivityItem[]` | See type | yes | — | Events, drawn in this order unless `order` sorts them. |
| onSelectedIdChange | `SelectedIdChangeHandler<ActivityItem> \| undefined` | See type | no | — | Called with the id of the event the person selects by click, Enter or Space, and details. |
| order | `ActivityOrder \| undefined` | "given", "newest", "oldest" | no | "given" | Sorts the events by `at`: `newest` or `oldest` first. `given` (the default) keeps the application's order. The sort is stable, so events at the same time keep their given order; branches stay under their parent and are sorted the same way among themselves. Events whose `at` does not parse go last. For a live feed, `oldest` adds arrivals at the end, where they move nothing; with `newest`, hold arrivals behind a count (R17.3). |
| selectedId | `string \| null \| undefined` | See type | no | — | The selected event's id, controlled; null selects none. Supplying this, `defaultSelectedId` or `onSelectedIdChange` makes the feed selectable. |
| timePlacement | `"end" \| "inline" \| undefined` | "end", "inline" | no | "end" | Where the relative time goes: `end` (the default) at the end of the event's line, or `inline` after the event's sentence, behind a middle dot ("… to High · 2 min ago"). |
| variant | `"feed" \| "timeline" \| undefined` | "feed", "timeline" | no | "feed" | `feed` (the default) draws each marker inline before its event. `timeline` puts every marker in one column on the reading-start side, joined by a rail from the first event to the last, with a small gap around each marker; events without an icon or tone get a node on the rail, and avatars and icons are sized to the column. Branches take a rail of their own. The time reserves its width there, so the clock's ticks do not re-wrap a row. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLOListElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
