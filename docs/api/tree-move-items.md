# TreeMoveItems

Move Up, Down, In and Out as menu rows, for a row's context menu or ⋯ menu: the
single-pointer alternative to dragging (WCAG 2.5.7). The same moves as the keyboard.

`import { TreeMoveItems } from "glass-ux/tree"`

[Live examples](https://dastari.github.io/glass-ux/components/tree-move-items)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| id | `string` | See type | yes | — | The row the menu is for. |
| tree | `{ readonly current: TreeHandle \| null; }` | See type | yes | — | The Tree's handle. |
