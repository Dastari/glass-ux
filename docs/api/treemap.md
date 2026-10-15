# Treemap

Nested rectangles sized by value — SpaceMonger/WinDirStat for disk usage. Tiles are soft
tints of their branch's (or kind's) colour with the 2px surface gap between them; labels
appear only where they fit and truncate with an ellipsis, the size line only where there is
height for it. Click or Enter drills into a tile; the path, Backspace and Escape go back.

  micro    a proportion strip of the top level, the largest as a trail
  compact  one level of tiles with labels, passive
  full     two levels (groups with a header, their children inside), the drill path, the
           tooltip (size, share of parent and of the whole) and keyboard navigation by
           direction

`import { Treemap } from "glass-ux/charts"`

[Live examples](https://dastari.github.io/glass-ux/components/treemap)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| colourBy | `ColourBy \| undefined` | "group", "branch", "depth" | no | "branch" | Colour by top-level branch (default), by each leaf's `group` (file kind) or by depth. |
| data | `HierarchyDatum` | See type | yes | — | Typed records rendered by the component. |
| emptyText | `ReactNode` | See type | no | — | One factual line for the empty state (R2.5): "No samples in the last hour". |
| errorText | `ReactNode` | See type | no | — | What failed and what to do (R2.4): "Agent offline — retry when NST-C106 reconnects". |
| format | `((value: number) => string) \| undefined` | See type | no | — | Full control of the number (the unit is still appended). |
| groups | `readonly string[] \| undefined` | See type | no | — | Group order for `colourBy="group"`; defaults to largest first. |
| label | `string` | See type | yes | — | Accessible name: what is plotted, for what, over when ("CPU · NST-C106 · last hour"). |
| nameLabel | `string \| undefined` | See type | no | "Name" | Header for the table's name column ("Folder"). |
| onRetry | `(() => void) \| undefined` | See type | no | — | Called when retry occurs. The callback type specifies its arguments. |
| state | `ChartState \| undefined` | "error", "ready", "loading", "empty" | no | "ready" | Controlled view state, including loading, empty and error states. |
| title | `string \| undefined` | See type | no | — | A visible label in Metric's label role. Omit inside a panel whose header already names it. |
| unit | `ChartUnit \| undefined` | See type | no | — | "%", "GB", "ms", or a counted noun ({ one, other })… "%" sticks to the number; other units take a space. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
