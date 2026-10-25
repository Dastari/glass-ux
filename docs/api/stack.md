# Stack

Children one after another with an even gap from the spacing roles: fields in a form,
buttons in a row, panels on a page. It owns spacing so children need no margins.

`import { Stack } from "glass-ux/layout"`

[Live examples](https://dastari.github.io/glass-ux/components/stack)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| align | `"center" \| "start" \| "end" \| "stretch" \| "baseline" \| undefined` | "center", "start", "end", "stretch", "baseline" | no | — | Cross-axis alignment of the children. Default: stretch in a column, centre in a row. |
| as | `ElementType \| undefined` | See type | no | "div" | The element. Default `div`. |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| direction | `"row" \| "column" \| undefined` | "row", "column" | no | "column" | `column` (default) or `row`, in the reading direction. |
| gap | `LayoutGap \| undefined` | "section", "none", 1, 2, 3, 4, 5, "inline", 12, 6, 8, "controls", "fields", "tiles", "panels", "half", 1.5, 2.5, 10, 16 | no | — | Space between children. Default `controls` in a row and `fields` in a column. |
| id | `string \| undefined` | See type | no | — | A stable element or component identifier. |
| justify | `"center" \| "start" \| "end" \| "between" \| undefined` | "center", "start", "end", "between" | no | — | Main-axis distribution of the children. Default: start. |
| role | `string \| undefined` | See type | no | — | An ARIA role when the container is a list, a group or a region. |
| style | `CSSProperties \| undefined` | See type | no | — | Inline style, merged after the layout's own variables. |
| wrap | `boolean \| undefined` | false, true | no | — | Let a row wrap onto more lines. |
