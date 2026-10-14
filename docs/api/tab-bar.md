# TabBar

Compose primary application navigation for a narrow viewport, with labelled items and active-state feedback.

`import { TabBar } from "glass-ux/shell"`

[Live examples](https://dastari.github.io/glass-ux/components/tab-bar)

## TabBar.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| condensed | `boolean \| undefined` | false, true | no | — | Force the condensed state (documentation); by default it follows scrolling. |

## TabBar.Item



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| active | `boolean \| undefined` | false, true | no | false | Marks the current destination or active choice. |
| icon | `ReactNode` | false, true | yes | — | An icon element without an explicit size; the component sizes it through its tokens. |
| label | `string` | See type | yes | — | The visible or accessible label for this component. |
| render | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | Base UI composition: supply an element or render function to replace the default element while preserving its behaviour. |

## TabBar.More



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| active | `boolean \| undefined` | false, true | no | false | Marks the current destination or active choice. |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| label | `string \| undefined` | See type | no | "More" | The visible or accessible label for this component. |
| title | `string \| undefined` | See type | no | "More" | The heading or title content. |

## TabBar.MoreItem



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| active | `boolean \| undefined` | false, true | no | false | Marks the current destination or active choice. |
| icon | `ReactNode` | false, true | yes | — | An icon element without an explicit size; the component sizes it through its tokens. |
| label | `string` | See type | yes | — | The visible or accessible label for this component. |
| render | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | Base UI composition: supply an element or render function to replace the default element while preserving its behaviour. |

## TabBar.MoreSection



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
