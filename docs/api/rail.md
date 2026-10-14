# Rail

Compose the primary application navigation rail from accessible items, separators and flexible spacers.

`import { Rail } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/rail)

## Rail.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aria-label | `string` | See type | yes | — | Accessible name of the navigation landmark. |

## Rail.Item



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| active | `boolean \| undefined` | false, true | no | false | This is the current section. |
| badge | `ReactNode` | false, true | no | — | A NotificationDot or count on the icon's corner. |
| disabledReason | `string \| undefined` | See type | no | — | Why the item does nothing here ("Choose an organisation to see its settings"). It stays focusable (aria-disabled) and the tooltip and description give the reason (R12.3, R20.5). |
| icon | `ReactNode` | false, true | yes | — | An icon element without an explicit size; the component sizes it through its tokens. |
| label | `string` | See type | yes | — | The destination's name: the accessible name and the tooltip. |
| render | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | Render as a router link: render={<Link to="/endpoints" />}. |
| shortcut | `string \| undefined` | See type | no | — | "g e" (press G, then E). Shown in the tooltip and handled by the rail. |

## Rail.Spacer



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |

## Rail.Shortcut



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| keys | `string` | See type | yes | — | Stable keys used to identify items. |
| onTrigger | `() => void` | See type | yes | — | Event callback; the typed signature specifies its arguments. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
