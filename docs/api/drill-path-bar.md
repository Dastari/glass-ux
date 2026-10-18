# DrillPathBar

Where a drill-down is: the root, each ancestor (each one navigates back) and the current
node. One line at the head's height; the middle collapses to "…" when the path is long and
every crumb truncates with an ellipsis.

`import { DrillPathBar } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/drill-path-bar)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string \| undefined` | See type | no | "Drill path" | The visible or accessible label for this component. |
| onSelect | `(depth: number) => void` | See type | yes | — | Called with the zero-based depth of the ancestor the person clicks (0 is the root); not called for the current node. Pass `useDrill().to`. |
| trail | `readonly Node[]` | See type | yes | — | Root first, focused node last, as `useDrill().trail` returns it; the last node renders as the current place. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
