# EntityHeader

A responsive page heading for an entity, with identity, status, supporting metadata and host-defined actions.

`import { EntityHeader } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-header)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actions | `ReactNode` | See type | no | — | ActionBar: header actions, primary right-most. |
| icon | `ReactNode` | See type | no | — | The entity's icon (IconEndpoint, IconOrganisation…). |
| iconStatus | `ReactNode` | See type | no | — | A StatusDot on the icon's corner. |
| status | `ReactNode` | See type | no | — | A StatusBadge beside the title. |
| subtitle | `ReactNode` | See type | no | — | Data only: model, owner, path. Never a description of the page. |
| tabs | `ReactNode` | See type | no | — | L2 Tabs. |
| title | `ReactNode` | See type | yes | — | The heading or title content. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |

Also accepts the element’s standard HTML attributes and React DOM events.
