# Progress

A task's progress in place: label and percentage, the bar, then a data line with an
optional action. Indeterminate work shows a soft accent bar with the page's shimmer
sweeping through it (still under reduced motion).

`import { Progress } from "glass-ux/progress"`

[Live examples](https://dastari.github.io/glass-ux/components/progress)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| action | `ReactNode` | See type | no | — | A trailing control on the meta line, normally a small Cancel button. |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when there is no visible label. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| label | `ReactNode` | See type | no | — | What is happening: "Installing Google Chrome 129.0". |
| max | `number \| undefined` | See type | no | 100 | Upper value or visible-item limit, as specified by the type. |
| meta | `ReactNode` | See type | no | — | Data under the bar: "1 of 3 devices completed". |
| showValue | `boolean \| undefined` | false, true | no | value !== null | Show the percentage at the end of the label line (default when determinate). |
| size | `ProgressSize \| undefined` | "sm", "md" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
| tone | `ProgressTone \| undefined` | "danger", "success", "accent" | no | "accent" | The semantic tone. Use danger and warning for consequences and states. |
| value | `number \| null` | See type | yes | — | 0–max, or null while the amount of work is unknown (indeterminate). |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
