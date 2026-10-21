---
name: glass-ux-data
description: Integrate Glass UX data tables, filters, charts, maps and topology with application-owned paging, queries and rendering adapters.
---

# Build data views

Before composing UI, read and apply the installed package's `docs/ui-rules.md`, especially
Screen content rules. These defaults apply to consuming websites and applications unless
explicit user or project instructions say otherwise: do not overuse subheadings, add
motivational/irrelevant/cheerful/promotional copy, overexplain the page, push primary content
down with redundant framing, repeat a route title already named by navigation, or introduce
content shifts that move buttons or menus. Use factual labels and reserve asynchronous
content space. Deliberate long-form documents may contain necessary headings and prose.

Read the installed API pages for `DataTable`, the selected chart or map, and
`docs/data-filters.md` or `docs/map.md` as appropriate.

Define stable row identifiers, typed columns, priorities, search fields and filters. Match
operators to what the backend can execute; give a filter or search a `toCondition` when the
server needs a hand-written `FilterCondition`. In a paged view the application supplies total
counts and server paging/filtering; filtering one downloaded page does not filter the dataset.
Use URL-state adapters with the host router when the state should be shareable.

For a long feed or log, pass `infinite={{ hasMore, onLoadMore, loadingMore }}` instead of
paging: the table asks for each batch as the end comes near, and the host appends it to
`rows` (Apollo `fetchMore`, TanStack Query `fetchNextPage`). Keep sorting, filters and search
server-side; a change starts a new list. With graphql-orm, use the offset list for sortable
tables and the keyset list only for a fixed order; `glass-ux/adapters/graphql-orm` has
`connectionRows`, `nextOffsetPage`, `nextKeysetPage` and the Apollo field policy
`connectionPagination()` (docs/data-filters.md).

Let navigation name the view: omit repeated headings and introductory paragraphs.
Use a bounded workspace with one primary table. Put related facts in the same row;
give independent datasets separate routed tabs. Table compositions use the padded
scroll/body slot. `WindowFrame.Body variant="fill"` removes that inset intentionally
for viewers, so do not choose it merely to make a table consume available space.

Decide which element scrolls. A fill table (the default) scrolls its own rows, so its parent
needs a definite height: every flex or grid ancestor between it and the bounded pane needs
`min-height: 0` (or a `minmax(0, 1fr)` track), or the body collapses and shows no rows.
Inside a pane or page that already scrolls, use `height="auto"` and let that pane scroll. Do
not cancel `wheel` events on an ancestor of a table (canvas zoom, custom scrolling); the
table's rows and the pane around it rely on the browser's own wheel scrolling.

Make technical/internal identifier columns optional initially with
`defaultHiddenColumns`. Keep the column definitions so the chooser and expandable
row/card details retain those values. Saved explicit choices, including all-visible,
win over defaults; Reset columns restores the application's defaults.

For a manual order (queues, playlists, priorities), pass `reorder={{ onReorder }}` and keep
the order in host data: apply `move.rows` (or `moveRow`) and persist `previousId`/`nextId`.
Return a promise for server saves; a rejection reverts the move. Do not add your own drag
handles or disable sorting UI; the grips explain why they are off while sorted, filtered,
searched, grouped or paged.

Below `cardBreakpoint` the table renders cards. Mark one column `cardRole: "title"` and,
where useful, `"subtitle"` and `"status"`. Other columns with priority 1–3 flow as compact
label/value pairs, lowest priority number first, so give the facts a phone user scans
(latency, devices, due date) priority 2. Priority 4–5 columns and `cardRole: "hidden"` sit
behind the card's "+N" toggle; hide a field the title already shows.

`onRowOpen` opens a row on Enter and, by default, on double-click. Where opening is the
row's main purpose (a list of records that each lead to a page), pass `rowOpen="click"`: a
plain primary click opens it and rows and cards show a pointer. Clicks on controls in the
row, modified clicks (Shift, Ctrl, ⌘, Alt keep their selection meanings) and a drag that
selects text do not open it.

The table's row, context and bulk actions read one `ActionSet`, declared with
`defineActions` from `glass-ux/actions`. Use shared cells for identity,
numbers, times, states and sparklines. Treat loading, empty and error states as part of the
same bounded body rather than inserting content that moves the layout.

Tables and charts format numbers, dates and counts in the resolved locale (`LocaleProvider`,
`configureLocale()`, `<html lang>`, then `en-US`). Use their `locale` prop only for a view that
must differ from the rest of the application. Pass server values as numbers and dates, not
preformatted strings.

Charts use the data palette and assign stable series identifiers. Semantic red/amber/green
represent thresholds and states. Provide a definite plot height and an accessible table view.
Maps and topology accept host-owned points, nodes, tile providers and attribution. Keep fixture
providers out of production integration and retain the declared source attribution.
