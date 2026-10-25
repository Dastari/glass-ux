# Stack

Children one after another with an even gap from the spacing roles: fields in a form,
buttons in a row, panels on a page. It owns spacing so children need no margins.

`import { Stack } from "glass-ux/layout"`

[Live examples](https://dastari.github.io/glass-ux/components/stack)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"center" \| "start" \| "end" \| "stretch" \| "baseline" \| undefined` | "center", "start", "end", "stretch", "baseline" | no | — |  |
| as | `ElementType \| undefined` | See type | no | "div" | The element. Default `div`. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| direction | `"row" \| "column" \| undefined` | "row", "column" | no | "column" | `column` (default) or `row`, in the reading direction. |
| gap | `LayoutGap \| undefined` | "section", "none", 1, 2, 3, 4, 5, "inline", 12, 6, "controls", "fields", "tiles", "panels", "half", 1.5, 2.5, 8, 10, 16 | no | — | Space between children. Default `controls` in a row and `fields` in a column. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| justify | `"center" \| "start" \| "end" \| "between" \| undefined` | "center", "start", "end", "between" | no | — |  |
| role | `string \| undefined` | See type | no | — |  |
| style | `CSSProperties \| undefined` | See type | no | — |  |
| wrap | `boolean \| undefined` | false, true | no | — | Let a row wrap onto more lines. |
