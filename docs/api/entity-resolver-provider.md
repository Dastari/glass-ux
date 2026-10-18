# EntityResolverProvider

Connect entity kinds, names, destinations, previews, search and actions to host-defined adapters.

`import { EntityResolverProvider } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-resolver-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| resolver | `EntityResolver` | See type | yes | — | The host adapter for entity kinds, previews, actions, navigation, search and rendering, read by every entity chip, link and picker below. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
