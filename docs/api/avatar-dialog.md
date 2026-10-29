# AvatarDialog

Change a person's photo: drop, browse for or paste an image, position it in the round crop
(drag, pinch, wheel or keys; the slider zooms) and save. The dialog checks the file against
`requirements` before it can be cropped and hands the cropped square to `onSave`; the
application uploads it. Outside presses do not close it, so a crop is never lost by a stray
click; Cancel and Esc abort a save that is still running.

`import { AvatarDialog } from "glass-ux/avatar"`

[Live examples](https://dastari.github.io/glass-ux/components/avatar-dialog)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Opens the uncontrolled overlay initially. |
| file | `File \| null \| undefined` | See type | no | — | A file to start from when the dialog opens, such as one dropped on the page. |
| name | `string` | See type | yes | — | The person's (or account's) name: the subtitle, and the initials when there is no photo. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the next open state when the trigger opens it, Cancel, Esc or the close button dismisses it, or it closes after a save or removal. Pair with `open` to control it. |
| onReject | `((rejection: AvatarRejection) => void) \| undefined` | See type | no | — | Called for each file refused by the requirements, with the reason shown in the dialog. |
| onRemove | `(() => unknown) \| undefined` | See type | no | — | Remove the current photo; runs like `onSave`. Without it, or without `src`, there is no Remove button. |
| onSave | `(change: AvatarChange, context: AvatarSaveContext) => unknown` | See type | yes | — | Save the photo: upload `change.blob` (or `change.original` with `change.crop`). The dialog shows pending until the promise settles, then ✓ and closes. If it rejects, the dialog stays open with the error's message (write it for the person) or a generic one. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| output | `AvatarOutput \| undefined` | See type | no | — | The cropped image: size in pixels (default 512), media type (default WebP) and quality. |
| requirements | `AvatarRequirements \| undefined` | See type | no | {} | What a photo must satisfy: types, bytes, minimum dimensions and the application's own check. |
| src | `string \| undefined` | See type | no | — | The current photo, shown until a new one is chosen. |
| title | `ReactNode` | See type | no | — | Dialog title. Default "Change photo". |
| trigger | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | The element that opens it. Omit when controlling `open`. |
