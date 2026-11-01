# ImageInput

An image as a form value: a thumbnail with Add, or Replace, Crop, Edit and Remove. Choosing an
image opens `ImageCropDialog`, and a file dropped on the thumbnail opens it ready to crop. The
library never uploads: the value is the new crop for the form to send, unless `onSave` uploads
as the dialog closes. `onEdit` hands the image to a host's own editor.

`import { ImageInput } from "glass-ux/image-cropper"`

[Live examples](https://dastari.github.io/glass-ux/components/image-input)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| alt | `string \| undefined` | See type | no | — | The picture's text alternative. Default "Chosen image". |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when no Field label names the control. |
| aspect | `ImageCropAspect \| undefined` | See type | no | "free" | Width ÷ height the crop keeps, or `"free"`. Default `"free"`. |
| aspects | `readonly ImageCropAspectOption[] \| undefined` | See type | no | — | Shapes to choose between in the dialog. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| defaultValue | `ImageFieldValue \| undefined` | See type | no | null | The starting image when uncontrolled. |
| disabled | `boolean \| undefined` | false, true | no | false | Disables interaction while retaining the component’s disabled appearance. |
| fields | `boolean \| undefined` | false, true | no | — | Show number fields in the dialog. Default true. |
| invalid | `boolean \| undefined` | false, true | no | — | Show the invalid state (set by ImageField when its error shows). |
| labels | `Partial<{ cropRole: string; cropLabel: string; cropInstructions: string; freeInstructions: string; zoom: string; aspect: string; free: string; left: string; top: string; width: string; height: string; changeImage: string; chooseImage: string; dropImage: string; chooseImageFirst: string; save: string; saving: string; saved: string; notSaved: string; cancel: string; removeImage: string; removing: string; savingImage: string; saveFailed: string; removeFailed: string; anyImage: string; notSupported: (name: string, formats: string) => string; tooLarge: (name: string, size: string) => string; unreadable: (name: string) => string; tooSmall: (width: string, height: string) => string; maxFileSize: (size: string) => string; minPixels: (width: string, height: string) => string; noImage: string; chosenImage: string; replace: string; crop: string; edit: string; remove: string; addImage: string; imageRequired: string; }> \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| name | `string \| undefined` | See type | no | — | Name for a native form submission: a hidden input carries a URL value. |
| onBlur | `((event: FocusEvent<HTMLDivElement>) => void) \| undefined` | See type | no | — | Called when focus leaves the control, for form libraries' touched state. |
| onEdit | `((value: Exclude<ImageFieldValue, null>) => void) \| undefined` | See type | no | — | Show an Edit button beside an image, for a richer editor of the host's. The field does not know what it opens; set the value when it is done. |
| onReject | `((rejection: ImageRejection) => void) \| undefined` | See type | no | — | Called for each file refused by the requirements. |
| onSave | `((change: ImageChange, context: ImageSaveContext) => unknown) \| undefined` | See type | no | — | Upload as the dialog saves, with the run's `{ signal, setProgress }`. Resolve with a URL to make it the value; otherwise the change itself is. Without it the change becomes the value and the form's submit uploads it: the library never does. |
| onValueChange | `((value: ImageFieldValue) => void) \| undefined` | See type | no | — | Called when a crop is saved or the image removed. |
| output | `ImageCropOutput \| undefined` | See type | no | — | The cropped image: size in pixels, media type (default WebP) and quality. |
| readOnly | `boolean \| undefined` | false, true | no | false | Shows the image without its actions; it cannot be changed. |
| requirements | `ImageRequirements \| undefined` | See type | no | — | What an image must satisfy: types, bytes, minimum dimensions and the application's own check. |
| shape | `"rect" \| "round" \| undefined` | "rect", "round" | no | "rect" | `round` shows a round thumbnail and crop. Default `rect`. |
| value | `ImageFieldValue \| undefined` | See type | no | — | The image. Pair with `onValueChange` to control it. |
