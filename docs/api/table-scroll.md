# TableScroll

The scroll box around an AI table: horizontal scroll for wide tables, vertical scroll past
`maxRows` with the header stuck, and the scrolled-edge hairlines (R5.8). Keyboard
scrollable (R20.6).

`import { TableScroll } from "glass-ux/ai"`

[Live examples](https://dastari.github.io/glass-ux/components/table-scroll)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string` | See type | yes | — | Accessible name of the scrolling region. |
| maxRows | `number \| undefined` | See type | no | — | Cap the height so long tables scroll inside themselves with a sticky header. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | See type | no | — | The content or component slots rendered inside the component. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLDivElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |

Also accepts the element’s standard HTML attributes and React DOM events.
