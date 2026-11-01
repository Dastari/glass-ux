# ImageCropper

Crop an image to a fixed shape or freely. With a locked aspect the image moves under a frame
of that shape (drag, pinch, wheel or keys; the slider zooms). With `"free"` a
box with handles sits over the whole image. `onValueChange` reports the crop in source
pixels once per gesture. Pair with `cropToBlob` to make the file, or use `ImageCropDialog`
for picking, checking and saving; the application uploads the result.

`import { ImageCropper } from "glass-ux/image-cropper"`

[Live examples](https://dastari.github.io/glass-ux/components/image-cropper)

## Props

| Prop | Type | Valid options | Required | Default | Description |
| --- | --- | --- | --- | --- | --- |
| actionsRef | `Ref<ImageCropperActions> \| undefined` | See type | no | — | Receives the cropper's commands. |
| aspect | `ImageCropAspect \| undefined` | See type | no | — | Width ÷ height the crop keeps, or `"free"`. Pair with `onAspectChange` to control it. |
| aspects | `readonly ImageCropAspectOption[] \| undefined` | See type | no | — | Shapes to choose between, shown as a segmented control. Without it the aspect stays as given. |
| className | `string \| undefined` | See type | no | — | Layout only. |
| defaultAspect | `ImageCropAspect \| undefined` | See type | no | "free" | The starting aspect when uncontrolled. Default `"free"`. |
| defaultValue | `ImageCropRect \| undefined` | See type | no | — | The starting crop when uncontrolled. Default: the largest crop of the shape, or the whole image. |
| disabled | `boolean \| undefined` | false, true | no | false | Disables interaction while retaining the component’s disabled appearance. |
| fields | `boolean \| undefined` | false, true | no | true | Show number fields for the crop's position and size: the way to place it with one pointer press at a time. Default true. |
| image | `ImageSize \| undefined` | See type | no | — | The image's pixel size, when known. Read from `src` otherwise. |
| labels | `Partial<{ cropRole: string; cropLabel: string; cropInstructions: string; freeInstructions: string; zoom: string; aspect: string; free: string; left: string; top: string; width: string; height: string; changeImage: string; chooseImage: string; dropImage: string; chooseImageFirst: string; save: string; saving: string; saved: string; notSaved: string; cancel: string; removeImage: string; removing: string; savingImage: string; saveFailed: string; removeFailed: string; anyImage: string; notSupported: (name: string, formats: string) => string; tooLarge: (name: string, size: string) => string; unreadable: (name: string) => string; tooSmall: (width: string, height: string) => string; maxFileSize: (size: string) => string; minPixels: (width: string, height: string) => string; noImage: string; chosenImage: string; replace: string; crop: string; edit: string; remove: string; addImage: string; imageRequired: string; }> \| undefined` | See type | no | — | Wording overrides. |
| locale | `string \| undefined` | See type | no | — | Formatting and wording locale; defaults to the nearest LocaleProvider. |
| minHeight | `number \| undefined` | See type | no | — | The smallest crop height in source pixels. |
| minWidth | `number \| undefined` | See type | no | — | The smallest crop width in source pixels; a locked crop stops zooming here. |
| onAspectChange | `((aspect: ImageCropAspect) => void) \| undefined` | See type | no | — | Called with the next aspect when the person picks one of `aspects`. |
| onValueChange | `((crop: ImageCropRect) => void) \| undefined` | See type | no | — | Called with the crop in whole pixels: when an image first shows, and once per gesture when it ends, never during a drag. |
| overlay | `ReactNode` | See type | no | — | Content over the frame, such as a drop hint; the frame takes a dashed outline while it shows. |
| placeholder | `ReactNode` | See type | no | — | Shown in the frame until there is an image. |
| shape | `"rect" \| "round" \| undefined` | "rect", "round" | no | "rect" | `round` dims the corners a round picture will not show; the crop is still a rectangle. Default `rect`. |
| src | `string \| undefined` | See type | no | — | The image's URL. Without it the frame shows `placeholder`. |
| value | `ImageCropRect \| undefined` | See type | no | — | The crop in the image's pixels. Pair with `onValueChange` to control it. |
