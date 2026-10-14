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

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
