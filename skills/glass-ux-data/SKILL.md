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
operators to what the backend can execute. In a paged view the application supplies total
counts and server paging/filtering; filtering one downloaded page does not filter the dataset.
Use URL-state adapters with the host router when the state should be shareable.

Let navigation name the view: omit repeated headings and introductory paragraphs.
Use a bounded workspace with one primary table. Put related facts in the same row;
give independent datasets separate routed tabs. Table compositions use the padded
scroll/body slot. `WindowFrame.Body variant="fill"` removes that inset intentionally
for viewers, so do not choose it merely to make a table consume available space.

Make technical/internal identifier columns optional initially with
`defaultHiddenColumns`. Keep the column definitions so the chooser and expandable
row/card details retain those values. Saved explicit choices, including all-visible,
win over defaults; Reset columns restores the application's defaults.

For a manual order (queues, playlists, priorities), pass `reorder={{ onReorder }}` and keep
the order in host data: apply `move.rows` (or `moveRow`) and persist `previousId`/`nextId`.
Return a promise for server saves; a rejection reverts the move. Do not add your own drag
handles or disable sorting UI; the grips explain why they are off while sorted, filtered,
searched, grouped or paged.

The table's row, context and bulk actions read one `ActionSet`. Use shared cells for identity,
numbers, times, states and sparklines. Treat loading, empty and error states as part of the
same bounded body rather than inserting content that moves the layout.

Charts use the data palette and assign stable series identifiers. Semantic red/amber/green
represent thresholds and states. Provide a definite plot height and an accessible table view.
Maps and topology accept host-owned points, nodes, tile providers and attribution. Keep fixture
providers out of production integration and retain the declared source attribution.
