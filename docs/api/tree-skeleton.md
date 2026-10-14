# TreeSkeleton

Placeholder rows with exactly the tree's row heights, icon boxes and text roles.

`import { TreeSkeleton } from "glass-ux/tree"`

[Live examples](https://dastari.github.io/glass-ux/components/tree-skeleton)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| rows | `TreeSkeletonRow[] \| undefined` | See type | no | DEFAULT_SKELETON | The kinds of rows to stand in for, in order. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
