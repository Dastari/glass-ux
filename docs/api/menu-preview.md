# MenuPreview

Static, non-interactive menu parts that render a menu's appearance in place, for documentation and previews.

`import { MenuPreview } from "glass-ux/menu"`

[Live examples](https://dastari.github.io/glass-ux/components/menu-preview)

## MenuPreview.Surface



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| label | `string` | See type | yes | — | The visible or accessible label for this component. |

## MenuPreview.Item



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| checked | `boolean \| undefined` | false, true | no | — | Controlled checked state. The type specifies whether mixed state is supported. |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| disabledReason | `string \| null \| undefined` | See type | no | — | Draws the row disabled. A live menu shows the reason as the row's tooltip; a static preview has none. |
| highlighted | `boolean \| undefined` | false, true | no | — | Marks the item reached through keyboard or pointer navigation. |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| radio | `boolean \| undefined` | false, true | no | — | Uses mutually exclusive radio selection. |
| reasonShown | `boolean \| undefined` | false, true | no | — | Ignored. A preview used to draw the reason line under the row. |
| shortcut | `string \| undefined` | See type | no | — | Keyboard shortcut shown with the control, using the host platform’s modifier keys. |
| submenu | `boolean \| undefined` | false, true | no | — | Nested menu content. |
| tone | `MenuItemTone \| undefined` | "danger", "default" | no | — | The semantic tone. Use danger and warning for consequences and states. |
| trail | `ReactNode` | See type | no | — | Ancestor trail before the current item. |

## MenuPreview.Group



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |

## MenuPreview.GroupLabel



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |

## MenuPreview.Separator



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
