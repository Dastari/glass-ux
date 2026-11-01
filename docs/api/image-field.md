# ImageField

ImageInput bound to an `ImageFieldValue` form field. Pair it with `imageSchema()`.

`import { ImageField } from "glass-ux/image-cropper"`

[Live examples](https://dastari.github.io/glass-ux/components/image-field)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| alt | `string \| undefined` | See type | no | — | The picture's text alternative. Default "Chosen image". |
| aria-label | `string \| undefined` | See type | no | — | Accessible name when no Field label names the control. |
| aside | `ReactNode` | See type | no | — | Right side of the label row: a live value readout or a small link. |
| aspect | `ImageCropAspect \| undefined` | See type | no | — | Width ÷ height the crop keeps, or `"free"`. Default `"free"`. |
| aspects | `readonly ImageCropAspectOption[] \| undefined` | See type | no | — | Shapes to choose between in the dialog. |
| className | `string \| undefined` | See type | no | — | Classes applied to the outer element for layout. Use the component props and theme tokens for its appearance. |
| fields | `boolean \| undefined` | false, true | no | — | Show number fields in the dialog. Default true. |
| hint | `ReactNode` | See type | no | — | The message line's resting text. Only when the format or consequence is not obvious (R2.8). |
| label | `ReactNode` | See type | no | — | Names the control. Omit only when a group legend or `aria-label` names it instead. |
| labels | `Partial<{ cropRole: string; cropLabel: string; cropInstructions: string; freeInstructions: string; zoom: string; aspect: string; free: string; left: string; top: string; width: string; height: string; changeImage: string; chooseImage: string; dropImage: string; chooseImageFirst: string; save: string; saving: string; saved: string; notSaved: string; cancel: string; removeImage: string; removing: string; savingImage: string; saveFailed: string; removeFailed: string; anyImage: string; notSupported: (name: string, formats: string) => string; tooLarge: (name: string, size: string) => string; unreadable: (name: string) => string; tooSmall: (width: string, height: string) => string; maxFileSize: (size: string) => string; minPixels: (width: string, height: string) => string; noImage: string; chosenImage: string; replace: string; crop: string; edit: string; remove: string; addImage: string; imageRequired: string; }> \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| onEdit | `((value: Exclude<ImageFieldValue, null>) => void) \| undefined` | See type | no | — | Show an Edit button beside an image, for a richer editor of the host's. The field does not know what it opens; set the value when it is done. |
| onReject | `((rejection: ImageRejection) => void) \| undefined` | See type | no | — | Called for each file refused by the requirements. |
| onSave | `((change: ImageChange, context: ImageSaveContext) => unknown) \| undefined` | See type | no | — | Upload as the dialog saves, with the run's `{ signal, setProgress }`. Resolve with a URL to make it the value; otherwise the change itself is. Without it the change becomes the value and the form's submit uploads it: the library never does. |
| optional | `boolean \| undefined` | false, true | no | — | Marks the label "Optional". Prefer this over marking required fields. |
| output | `ImageCropOutput \| undefined` | See type | no | — | The cropped image: size in pixels, media type (default WebP) and quality. |
| readOnly | `boolean \| undefined` | false, true | no | — | Shows the image without its actions; it cannot be changed. |
| required | `boolean \| undefined` | false, true | no | — | Shows the required marker. Pass `required` to the control as well. |
| requirements | `ImageRequirements \| undefined` | See type | no | — | What an image must satisfy: types, bytes, minimum dimensions and the application's own check. |
| shape | `"rect" \| "round" \| undefined` | "rect", "round" | no | — | `round` shows a round thumbnail and crop. Default `rect`. |
| warning | `ReactNode` | See type | no | — | Non-blocking warning in the reserved message slot; errors take precedence. |

Inherited properties:

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| disabled | `boolean \| undefined` | false, true | no | — | Whether the component should ignore user interaction. Takes precedence over the `disabled` prop on the `<Field.Control>` component. |
