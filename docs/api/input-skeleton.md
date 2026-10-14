# InputSkeleton

The loading box of an Input (no label; use Field.Skeleton for a full field).

`import { InputSkeleton } from "glass-ux/input"`

[Live examples](https://dastari.github.io/glass-ux/components/input-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| size | `InputSize \| undefined` | "sm", "md", "lg" | no | "md" | The token-based size. Touch targets adapt to coarse pointers independently of the selected density. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
