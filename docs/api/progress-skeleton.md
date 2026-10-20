# ProgressSkeleton

Same rows and heights as a loaded Progress.

`import { ProgressSkeleton } from "glass-ux/progress"`

[Live examples](https://dastari.github.io/glass-ux/components/progress-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| action | `boolean \| undefined` | false, true | no | false | Trailing action for a notice or result. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| label | `boolean \| undefined` | false, true | no | true | The visible or accessible label for this component. |
| meta | `boolean \| undefined` | false, true | no | false | Supporting data displayed with the item. |
| size | `ProgressSize \| undefined` | "sm", "md" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |
