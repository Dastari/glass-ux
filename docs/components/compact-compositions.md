# Compact compositions

These components compose the existing controls and theme tokens for common application patterns.
They do not own routing, domain queries, persistence or backend authorization.

| Pattern                               | Import                   | Use                                                                                                                                         |
| ------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Semantic dot, ring or pulse           | `glass-ux/tone-dot`      | `ToneDot` with a semantic `tone` and accessible `label`; omit the label when decorative. Use `StatusDot` for an endpoint connection status. |
| Small label/value list                | `glass-ux/fact-list`     | `FactList` renders a semantic `dl` without a tile around each fact. Use `DetailTile` for larger readings.                                   |
| Button appearance with link semantics | `glass-ux/button-link`   | `ButtonLink` keeps a native anchor and shares Button sizes and variants. Compose the router anchor through `render`.                        |
| Clickable compact row                 | `glass-ux/list-row`      | `ListRow` composes icon, title, metadata and trailing content, with a native button or supplied link.                                       |
| Time-stamped activity                 | `glass-ux/activity-feed` | `ActivityFeed` renders an ordered feed with shared relative times and exact-time tooltips.                                                  |
| Meter in a data-table cell            | `glass-ux/meter-cell`    | `MeterCell` always keeps its reading and hides the bar in a narrow cell. Values stay numeric.                                               |
| Many identity chips                   | `glass-ux/chip-overflow` | `ChipOverflow` shows the first chips and a searchable overflow popover. Supply stable IDs and the identity renderer.                        |

Each component has a dedicated example, usage and complete typed API page in the gallery
and in `docs/api/`. Compose their public props rather than overriding private class styles.
They follow the installed theme's spacing, density, type, borders and corner geometry.

`TruncatedText` accepts strings or React nodes and shows a tooltip only when measured text
is clipped. Standalone clipped text can receive keyboard focus; text inside a focusable
control adds no second tab stop. `RelativeTime` handles past and future dates on a shared
clock and exposes the exact date through Tooltip. `Field.warning` uses the existing reserved
message slot without marking a valid value invalid.

Use `formatCount` for counts and `localPage` only for collections you have loaded completely.
Never filter a single incomplete server page locally or label its length as a total. When
loading from a backend, map table state to the backend's accepted Where, OrderBy and page
contracts and retain source scalar units.
