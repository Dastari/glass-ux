# IdentityCell

The two-line identity cell: a status-dotted glyph, the name, and a data subtitle. It is
EntityIdentity's row tier, so a table's identity column is the same object as the
entity's header, tree row and chip. The row owns the actions (⋯ and right-click), so the
cell is passive. Used as the title column of entity tables and as the card title.

`import { IdentityCell } from "glass-ux/data-table"`

[Live examples](https://dastari.github.io/glass-ux/components/identity-cell)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| icon | `ReactNode` | See type | no | — | Entity glyph. Defaults to a generic monitor glyph; pass the entity's own icon without a size. |
| status | `EndpointStatus \| undefined` | "warning", "error", "online", "offline", "installing", "maintenance", "connecting", "live" | no | — | Live state, drawn as the shared status dot on the glyph's corner. |
| statusLabel | `string \| undefined` | See type | no | — | Accessible text for the status dot. Defaults to the state's name ("Online"). |
| subtitle | `ReactNode` | See type | no | — | Data only (R2.2): an owner, path or identifier, never a description. |
| title | `ReactNode` | See type | yes | — | The entity's name: a record, person or organisation. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
