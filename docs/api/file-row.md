# FileRow

One file in a FileList: name, size and state, a progress bar of fixed height, remove.

`import { FileRow } from "glass-ux/file-drop"`

[Live examples](https://dastari.github.io/glass-ux/components/file-row)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| error | `string \| undefined` | See type | no | — | What went wrong, in place of the size line ("Upload failed — retry when online"). |
| name | `string` | See type | yes | — | The component’s name or native form field name, as specified by its value type. |
| onRemove | `(() => void) \| undefined` | See type | no | — | Called when the row's remove button is pressed. Without it the row has no remove button. |
| progress | `number \| null \| undefined` | See type | no | — | 0–100 while uploading; null for unknown. |
| size | `number` | See type | yes | — | Bytes. |
| status | `FileStatus \| undefined` | "done", "error", "queued", "uploading" | no | "done" | Current operation or connection status. |

Standard React DOM attributes and events are accepted wherever the component extends a native element. The online API page lists those inherited properties as well.
