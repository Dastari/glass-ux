# VerticalTabs

Sections held in component state: `Root` (the selected value, controlled or uncontrolled;
a rail, chip strip or picker depending on its own width) and `Panel`. For sections that
are routes, use `RouteVerticalTabs`.

`import { VerticalTabs } from "glass-ux/vertical-tabs"`

[Live examples](https://dastari.github.io/glass-ux/components/vertical-tabs)

## VerticalTabs.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Names the rail, e.g. "Agent settings sections". |
| defaultValue | `string \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| items | `VerticalTabItem[]` | See type | yes | — | The collection rendered by the component. Stable identifiers preserve selection and keyboard focus. |
| layout | `VerticalTabsLayout \| undefined` | "select", "rail", "icons", "chips" | no | — | Force a layout instead of following the container. |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called with the chosen section's `value` when the person selects a tab, chip or picker item. Pair with `value` to control it. |
| value | `string \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

## VerticalTabs.Panel



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| (((state: import("@base-ui/react").TabsPanelState) => string \| undefined) & string) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
