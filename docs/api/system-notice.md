# SystemNotice

A change to the conversation itself (scope switched, context added, model changed).

`import { SystemNotice } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/system-notice)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| at | `number \| undefined` | See type | no | — | Time associated with the record. |
| children | `ReactNode` | See type | yes | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| icon | `ReactNode` | See type | no | — | An icon element without an explicit size; the component sizes it through its tokens. |
