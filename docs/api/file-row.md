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
| status | `FileStatus \| undefined` | "error", "done", "queued", "uploading" | no | "done" | Current operation or connection status. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| defaultValue | `string \| number \| readonly string[] \| undefined` | See type | no | — | The initial value when using the component without controlling its state. |
| ref | `Ref<HTMLLIElement> \| undefined` | See type | no | — | Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or call the ref with `null` if you passed a callback ref). |
| value | `string \| number \| readonly string[] \| undefined` | See type | no | — | The controlled value. Keep it in application state and update it in the change callback. |

Also accepts the element’s standard HTML attributes and React DOM events.
