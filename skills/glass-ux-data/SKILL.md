---
name: glass-ux-data
description: Integrate Glass UX data tables, filters, charts, maps and topology with application-owned paging, queries and rendering adapters.
---

# Build data views

Read the installed API pages for `DataTable`, the selected chart or map, and
`docs/data-filters.md` or `docs/map.md` as appropriate.

Define stable row identifiers, typed columns, priorities, search fields and filters. Match
operators to what the backend can execute. In a paged view the application supplies total
counts and server paging/filtering; filtering one downloaded page does not filter the dataset.
Use URL-state adapters with the host router when the state should be shareable.

The table's row, context and bulk actions read one `ActionSet`. Use shared cells for identity,
numbers, times, states and sparklines. Treat loading, empty and error states as part of the
same bounded body rather than inserting content that moves the layout.

Charts use the data palette and assign stable series identifiers. Semantic red/amber/green
represent thresholds and states. Provide a definite plot height and an accessible table view.
Maps and topology accept host-owned points, nodes, tile providers and attribution. Keep fixture
providers out of production integration and retain the declared source attribution.
