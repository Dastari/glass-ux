# TextCell

Single-line text that truncates with an ellipsis; the full text appears on hover.

`import { TextCell } from "glass-ux/data-table"`

[Live examples](https://dastari.github.io/glass-ux/components/text-cell)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| children | `ReactNode` | false, true | yes | — | The content or component slots rendered inside the component. |
| identifier | `boolean \| undefined` | false, true | no | — | Identifiers (IP addresses, serials, versions): tabular figures (R8.4). |
| muted | `boolean \| undefined` | false, true | no | — | Secondary text in the muted ink. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
