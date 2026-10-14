# Disclosure

A single show/hide section with the accordion's row and motion.

`import { Disclosure } from "glass-ux/accordion"`

[Live examples](https://dastari.github.io/glass-ux/components/disclosure)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| icon | `ReactNode` | false, true | no | — | Leading icon after the chevron. Pass it without a size. |
| meta | `ReactNode` | false, true | no | — | Trailing data: a count, a status, a short value. |
| title | `ReactNode` | false, true | yes | — | The heading or title content. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
