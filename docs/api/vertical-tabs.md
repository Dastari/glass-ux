# VerticalTabs

L3 navigation: a section rail that becomes chips, or a picker past six sections, in narrow containers.

`import { VerticalTabs } from "glass-ux/vertical-tabs"`

[Live examples](https://dastari.github.io/glass-ux/components/vertical-tabs)

## VerticalTabs.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Names the rail, e.g. "Agent settings sections". |
| defaultValue | `string \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| items | `VerticalTabItem[]` | See type | yes | — | The collection rendered by the component. Stable identifiers preserve selection and keyboard focus. |
| layout | `VerticalTabsLayout \| undefined` | "select", "rail", "icons", "chips" | no | — | Force a layout instead of following the container. |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called when value change occurs. The callback type specifies its arguments. |
| value | `string \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

## VerticalTabs.Panel



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| (((state: import("@base-ui/react").TabsPanelState) => string \| undefined) & string) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
