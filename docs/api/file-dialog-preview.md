# FileDialogPreview

The same dialog in the page flow, for documentation and screenshots. Real parts, non-modal.

`import { FileDialogPreview } from "glass-ux/file-dialog"`

[Live examples](https://dastari.github.io/glass-ux/components/file-dialog-preview)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultOpen | `boolean \| undefined` | false, true | no | — | Whether it starts open when uncontrolled. |
| defaultUri | `string \| undefined` | See type | no | — | Start here; otherwise the last place used in this session. |
| defaultView | `FileDialogView \| undefined` | "grid", "list" | no | — | How entries show at first when uncontrolled. Default `list`. |
| mode | `"open" \| "save"` | "open", "save" | yes | — | Choose existing files. Choose where to write. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the next open state, after a dismissal and after a run succeeds. Not called while a run is cancelled in place. |
| onViewChange | `((view: FileDialogView) => void) \| undefined` | See type | no | — | Called with the view the person picks. |
| open | `boolean \| undefined` | false, true | no | — | Whether the dialog is open. Controlled while defined. |
| providers | `readonly FileProvider[]` | See type | yes | — | The locations offered, in order. One hides the location list. |
| title | `string \| undefined` | See type | no | — | The dialog's title. Default Open, Open files or Save as. |
| trigger | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | The element that opens it. Omit when controlling `open`. |
| view | `FileDialogView \| undefined` | "grid", "list" | no | — | How entries show. Controlled while defined. `grid` needs `thumbnail` on the location. |
