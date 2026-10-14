# FilterEditor

Server-side sorting and pages, columns that fold by priority into “+N” and then cards, resizable and pinned columns, bulk actions and live rows.

`import { FilterEditor } from "glass-ux/data-table"`

[Live examples](https://dastari.github.io/glass-ux/components/filter-editor)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| label | `string` | See type | yes | — | The filter's name for accessible labels ("Operating system"). |
| onChange | `(value: unknown) => void` | See type | yes | — | Apply now and stay open (live editors). Undefined removes the filter. |
| onCommit | `(value: unknown) => void` | See type | yes | — | Apply and close (Enter, Apply, Clear). Undefined removes the filter. |
| onFlush | `((apply: (() => void) \| null) => void) \| undefined` | See type | no | — | Register the function that applies a pending typed value: the popover calls it when it closes by a click outside (Esc discards). |
| onLabels | `((labels: ReadonlyArray<readonly [string, string]>) => void) \| undefined` | See type | no | — | Labels learnt from a server-loaded option list (for chips). |
| spec | `FilterSpec` | See type | yes | — | Typed rendering or field specification. |
| value | `unknown` | See type | yes | — | The controlled value. Keep it in application state and update it in the change callback. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
