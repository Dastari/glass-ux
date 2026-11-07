# FileDialog

Open, save and folder dialogs over any `FileProvider`. It lists and chooses, and never reads file
contents or writes them: the host does that in `onOpen`, `onSave` and `onChoose`, with
`{ signal, setProgress }`, so the library still never uploads.

It adapts to what a provider has: no `readDirectory` gives a location field, no `write` leaves
the provider out of Save, no `thumbnail` leaves the list view, and no `createDirectory`, `rename`
or `delete` means no such command. An entry's `denied` disables the action and shows the reason.
`mode="folder"` returns the folder selected in the list, or else the one showing, and `places`
adds shortcuts to common folders in any mode.

Keyboard: arrows move, Enter opens, Space selects, Shift extends, ⌘/Ctrl+A selects all loaded,
Backspace goes up a level, F2 renames, Delete deletes, typing jumps to a name, and Shift+F10 or
the Menu key opens a row's menu. Escape closes; during a run it cancels the run and stays open.
On phones it is a bottom sheet, the folders give way to the path line, and places to a menu.

`import { FileDialog } from "glass-ux/file-dialog"`

[Live examples](https://dastari.github.io/glass-ux/components/file-dialog)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Whether it starts open when uncontrolled. |
| defaultUri | `string \| undefined` | See type | no | — | Start here; otherwise the last place used in this session. |
| defaultView | `FileDialogView \| undefined` | "grid", "list" | no | — | How entries show at first when uncontrolled. Default `list`. |
| mode | `"open" \| "save" \| "folder"` | "open", "save", "folder" | yes | — | Choose existing files. Choose where to write. Choose a folder: the one selected in the list, or else the one showing. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the next open state, after a dismissal and after a run succeeds. Not called while a run is cancelled in place. |
| onViewChange | `((view: FileDialogView) => void) \| undefined` | See type | no | — | Called with the view the person picks. |
| open | `boolean \| undefined` | false, true | no | — | Whether the dialog is open. Controlled while defined. |
| places | `readonly FileDialogPlace[] \| undefined` | See type | no | — | Shortcuts to common folders. The application names them, since a location has no idea what its Documents or Downloads is. Each jumps there, switching location if it needs to. |
| providers | `readonly FileProvider[]` | See type | yes | — | The locations offered, in order. One hides the location list. |
| title | `string \| undefined` | See type | no | — | The dialog's title. Default Open, Open files, Choose a folder or Save as. |
| trigger | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | The element that opens it. Omit when controlling `open`. |
| view | `FileDialogView \| undefined` | "grid", "list" | no | — | How entries show. Controlled while defined. `grid` needs `thumbnail` on the location. |
