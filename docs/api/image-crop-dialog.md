# ImageCropDialog

Choose an image and crop it: drop, browse for or paste a file, position it (see
`ImageCropper`) and save. The dialog checks the file against `requirements` before it can be
cropped and hands the result to `onSave`; the application uploads it. Outside presses do not
close it, so a crop is never lost by a stray click; Cancel and Esc abort a save that is still
running.

`import { ImageCropDialog } from "glass-ux/image-cropper"`

[Live examples](https://dastari.github.io/glass-ux/components/image-crop-dialog)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| aspect | `ImageCropAspect \| undefined` | See type | no | — | Width ÷ height the crop keeps, or `"free"`. Default `"free"`. |
| aspects | `readonly ImageCropAspectOption[] \| undefined` | See type | no | — | Shapes to choose between. |
| className | `string \| undefined` | See type | no | — | Layout only, on the dialog's content. |
| defaultOpen | `boolean \| undefined` | false, true | no | false | Opens the uncontrolled overlay initially. |
| fields | `boolean \| undefined` | false, true | no | — | Show number fields for the crop's position and size. Default true. |
| file | `File \| null \| undefined` | See type | no | — | A file to start from when the dialog opens, such as one dropped on the page. |
| labels | `Partial<{ cropRole: string; cropLabel: string; cropInstructions: string; freeInstructions: string; zoom: string; aspect: string; free: string; left: string; top: string; width: string; height: string; changeImage: string; chooseImage: string; dropImage: string; chooseImageFirst: string; save: string; saving: string; saved: string; notSaved: string; cancel: string; removeImage: string; removing: string; savingImage: string; saveFailed: string; removeFailed: string; anyImage: string; notSupported: (name: string, formats: string) => string; tooLarge: (name: string, size: string) => string; unreadable: (name: string) => string; tooSmall: (width: string, height: string) => string; maxFileSize: (size: string) => string; minPixels: (width: string, height: string) => string; noImage: string; chosenImage: string; replace: string; crop: string; edit: string; remove: string; addImage: string; imageRequired: string; }> \| undefined` | See type | no | — | Wording overrides. |
| onOpenChange | `((open: boolean) => void) \| undefined` | See type | no | — | Called with the next open state when the trigger opens it, Cancel, Esc or the close button dismisses it, or it closes after a save or removal. Pair with `open` to control it. |
| onReject | `((rejection: ImageRejection) => void) \| undefined` | See type | no | — | Called for each file refused by the requirements, with the reason shown in the dialog. |
| onRemove | `(() => unknown) \| undefined` | See type | no | — | Remove the current image; runs like `onSave`. Without it there is no Remove button. |
| onSave | `(change: ImageChange, context: ImageSaveContext) => unknown` | See type | yes | — | Save the image: upload `change.blob` (or `change.original` with `change.crop`). The dialog shows pending until the promise settles, then ✓ and closes. If it rejects, the dialog stays open with the error's message (write it for the person) or a generic one. |
| open | `boolean \| undefined` | false, true | no | — | Controls whether the overlay is open. |
| output | `ImageCropOutput \| undefined` | See type | no | — | The cropped image: size in pixels, media type (default WebP) and quality. |
| placeholder | `ReactNode` | See type | no | — | Shown in the frame until an image is chosen, such as the current one. |
| requirements | `ImageRequirements \| undefined` | See type | no | {} | What an image must satisfy: types, bytes, minimum dimensions and the application's own check. |
| shape | `"rect" \| "round" \| undefined` | "rect", "round" | no | — | `round` dims the corners a round picture will not show. |
| subtitle | `ReactNode` | See type | no | — | The line under the title. |
| title | `ReactNode` | See type | no | — | Dialog title. Default "Change image". |
| trigger | `ReactElement<unknown, string \| import("react").JSXElementConstructor<any>> \| undefined` | See type | no | — | The element that opens it. Omit when controlling `open`. |
