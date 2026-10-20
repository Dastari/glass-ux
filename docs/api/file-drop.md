# FileDrop

Drop files on the dashed tile, or activate it to browse. The file input itself is the
focusable control (so a Field label names it and Enter/Space open the picker); the
tile shows its focus. Rejected files are reported to `onFiles` with a reason for the
field's message line — the tile never grows to show errors.

`import { FileDrop } from "glass-ux/file-drop"`

[Live examples](https://dastari.github.io/glass-ux/components/file-drop)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| accept | `string \| undefined` | See type | no | — | Same syntax as <input accept>: ".msi,.exe" or "image/*". |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when no Field label names it (a Field label is preferred). |
| className | `string \| undefined` | See type | no | — | Layout only. |
| disabled | `boolean \| undefined` | false, true | no | false | Disables interaction while retaining the component’s disabled appearance. |
| dragging | `boolean \| undefined` | false, true | no | false | Show the drag-over state without a drag (documentation and tests). |
| existing | `number \| undefined` | See type | no | 0 | Files already in the list (for maxFiles). |
| hint | `ReactNode` | See type | no | — | The limits line. Default: built from maxSize and accept ("Max 500 MB per file · .msi or .exe"). |
| invalid | `boolean \| undefined` | false, true | no | — | Invalid outside a Field. |
| maxFiles | `number \| undefined` | See type | no | — | Files allowed in total, counting `existing`. |
| maxSize | `number \| undefined` | See type | no | — | Bytes per file. |
| multiple | `boolean \| undefined` | false, true | no | true | Allows more than one selected value. |
| onFiles | `(accepted: File[], rejected: FileRejection[]) => void` | See type | yes | — | Called with the files that fit the limits and the ones that do not (with reasons). |
| variant | `"full" \| "compact" \| undefined` | "full", "compact" | no | "full" | full: the dashed tile. compact: one control-height row for toolbars and table rows. |
