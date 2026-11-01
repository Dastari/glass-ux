# FileConflictDialog

The conflict step alone, for a plain Save that opens no dialog: someone else's write got there
first, and nothing has closed, so no edits are lost. It says who won and offers Replace, Save a
copy and Compare; `FileDialog` shows it when `onSave` returns a conflict.

`import { FileConflictDialog } from "glass-ux/file-dialog"`

[Live examples](https://dastari.github.io/glass-ux/components/file-conflict-dialog)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| current | `FileStat \| null` | See type | yes | — | The file as it is now, or null if it has gone. |
| name | `string` | See type | yes | — | The file's name. |
| onCompare | `((current: FileStat \| null) => void) \| undefined` | See type | no | — | Adds Compare. |
| onResolve | `(choice: FileConflictChoice) => void` | See type | yes | — | Called once with the choice. Escape is `cancel`. Close it by setting `open`. |
| open | `boolean` | false, true | yes | — | Whether the question is showing. |
