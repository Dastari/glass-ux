# EntityResolverProvider

Connect entity kinds, names, destinations, previews, search and actions to host-defined adapters.

`import { EntityResolverProvider } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/entity-resolver-provider)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| resolver | `EntityResolver` | See type | yes | — | Host entity resolver for identity, previews, search, actions and navigation. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
