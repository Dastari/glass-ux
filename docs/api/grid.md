# Grid

Cells in columns: a fixed count, or as many as fit the container at a minimum width.

`import { Grid } from "glass-ux/layout"`

[Live examples](https://dastari.github.io/glass-ux/components/grid)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"center" \| "start" \| "end" \| "stretch" \| undefined` | "center", "start", "end", "stretch" | no | — |  |
| as | `ElementType \| undefined` | See type | no | "div" | The element. Default `div`. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| columns | `number \| { min: GridMin \| (string & {}); } \| undefined` | See type | no | DEFAULT_COLUMNS | Columns: a fixed count, or `{ min }` for as many columns as fit at least `min` wide, filling the container. `min` is a named width (GridMin) or any CSS length. Default `md`. |
| gap | `LayoutGap \| undefined` | "section", "none", 1, 2, 3, 4, 5, "inline", 12, 6, "controls", "fields", "tiles", "panels", "half", 1.5, 2.5, 8, 10, 16 | no | "tiles" | Space between cells. Default `tiles`. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| role | `string \| undefined` | See type | no | — |  |
| rowGap | `LayoutGap \| undefined` | "section", "none", 1, 2, 3, 4, 5, "inline", 12, 6, "controls", "fields", "tiles", "panels", "half", 1.5, 2.5, 8, 10, 16 | no | — | Row gap when it differs from the column gap. |
| style | `CSSProperties \| undefined` | See type | no | — |  |
