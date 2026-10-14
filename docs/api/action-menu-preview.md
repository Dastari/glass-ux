# ActionMenuPreview

The same menu drawn statically, for documentation. `openSubmenu` shows one submenu open
beside it, and `highlight` marks a row as if hovered.

`import { ActionMenuPreview } from "glass-ux/actions"`

[Live examples](https://dastari.github.io/glass-ux/components/action-menu-preview)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| highlight | `string \| undefined` | See type | no | — | Ranges or value highlighted in a search result. |
| label | `string` | See type | yes | — | The visible or accessible label for this component. |
| openSubmenu | `string \| undefined` | See type | no | — | Currently open submenu identifier. |
| set | `ActionSet<T>` | See type | yes | — | Shared action definitions used by menus, headers and the command palette. |
| targets | `readonly T[]` | See type | yes | — | Selected entities passed to action visibility, enablement, confirmation and execution. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
