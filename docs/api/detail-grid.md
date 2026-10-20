# DetailGrid

Tiles in an auto-fill grid that reflows with its container (R5.5): as many columns as fit
at the minimum tile width, never a fixed count.

`import { DetailGrid } from "glass-ux/detail-tile"`

[Live examples](https://dastari.github.io/glass-ux/components/detail-grid)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| min | `"sm" \| "md" \| "lg" \| undefined` | "sm", "md", "lg" | no | "md" | Smallest tile width before the grid drops a column. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
