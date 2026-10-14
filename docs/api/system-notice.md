# SystemNotice

A change to the conversation itself (scope switched, context added, model changed).

`import { SystemNotice } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/system-notice)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| at | `number \| undefined` | See type | no | — | Time associated with the record. |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| icon | `ReactNode` | false, true | no | — | An icon element without an explicit size; the component sizes it through its tokens. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
