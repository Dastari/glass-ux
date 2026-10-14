# EntityHeader

A responsive page heading for an entity, with identity, status, supporting metadata and host-defined actions.

`import { EntityHeader } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-header)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ReactNode` | false, true | no | — | ActionBar: header actions, primary right-most. |
| icon | `ReactNode` | false, true | no | — | The entity's icon (IconEndpoint, IconOrganisation…). |
| iconStatus | `ReactNode` | false, true | no | — | A StatusDot on the icon's corner. |
| status | `ReactNode` | false, true | no | — | A StatusBadge beside the title. |
| subtitle | `ReactNode` | false, true | no | — | Data only: model, owner, path. Never a description of the page. |
| tabs | `ReactNode` | false, true | no | — | L2 Tabs. |
| title | `ReactNode` | false, true | yes | — | The heading or title content. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
