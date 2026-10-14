# Accordion

Sections that open in place. The chevron turns; items are set apart by space and hover
fills, never by dividers (R5.8). Use for secondary detail (advanced settings, raw data),
not for primary navigation.

`import { Accordion } from "glass-ux/accordion"`

[Live examples](https://dastari.github.io/glass-ux/components/accordion)

## Accordion.Root



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |

## Accordion.Item



| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| icon | `ReactNode` | false, true | no | — | Leading icon after the chevron. Pass it without a size. |
| level | `2 \| 3 \| 4 \| 5 \| undefined` | 2, 3, 4, 5 | no | 3 | Heading level of the trigger, to fit the page outline. |
| meta | `ReactNode` | false, true | no | — | Trailing data: a count, a status, a short value. |
| title | `ReactNode` | false, true | yes | — | The heading or title content. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
