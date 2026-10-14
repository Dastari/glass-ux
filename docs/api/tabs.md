# Tabs

L2 navigation: icon tabs with a sliding accent underline. They never wrap; overflow moves into More.

`import { Tabs } from "glass-ux/tabs"`

[Live examples](https://dastari.github.io/glass-ux/components/tabs)

## Tabs.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| onValueChange | `((value: string) => void) \| undefined` | See type | no | — | Called with the next tab. Write it to the URL when the tab is a place (R6.2). |
| value | `string \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

## Tabs.List



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string \| undefined` | See type | no | — | Names the tab list for assistive tech, e.g. "NST-C106 sections". |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| items | `TabItem[]` | See type | yes | — | The collection rendered by the component. Stable identifiers preserve selection and keyboard focus. |

## Tabs.Panel



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| (((state: import("@base-ui/react").TabsPanelState) => string \| undefined) & string) \| undefined` | See type | no | — | CSS class applied to the element, or a function that returns a class based on the component's state. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
