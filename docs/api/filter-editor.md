# FilterEditor

Renders the editor for a column's filter kind (text, number, date, boolean, options, uuid or the column's custom editor).

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
