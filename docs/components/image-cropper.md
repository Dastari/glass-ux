# Image cropper

`glass-ux/image-cropper` · [Live component catalogue](https://dastari.github.io/glass-ux/)

Three layers, each usable alone. `ImageCropper` is the crop itself. `ImageCropDialog` adds
picking, checking and saving a file. `ImageField` holds the result as a form value. The library
never uploads: the application stores what `onSave` or the form's submit receives. `EditableAvatar`
and `AvatarDialog` are a round, square preset of the dialog.

```tsx
import { cropToBlob, ImageCropper } from "glass-ux/image-cropper"

<ImageCropper src={url} aspect={16 / 9} minWidth={640} onValueChange={setCrop} />

const blob = await cropToBlob(file, crop, { width: 1600, type: "image/jpeg", quality: 0.85 })
```

- **Aspect:** a number keeps that shape: the image moves under the frame by drag, pinch, wheel or
  arrow keys, and `+`, `-` and the slider zoom. `"free"` shows the whole image with a box and eight
  handles. Pass `aspects` to offer presets, including `{ value: "free", label: "Free" }`; `aspect`
  and `onAspectChange` control the choice.
- **Value:** `{ x, y, width, height }` in the source image's whole pixels. `onValueChange` fires
  when an image first shows and once per gesture when it ends, never during a drag.
  `actionsRef` gives the live crop (`crop()`) and `fit()` for a host's own toolbar.
- **Keyboard:** the frame is one tab stop. Locked: arrows move the image, Shift for larger steps,
  `+` and `-` zoom, `0` fits. Free: arrows move the box, Alt with an arrow resizes it, `0` selects
  the whole image. Arrows are physical in every language: a picture does not mirror.
- **Single pointer:** `fields` (default true) shows Left, Top, Width and Height, whose steppers
  place the crop without dragging. Turn them off only where something else does that.
- **Not included:** rotation and flip. A crop is a rectangle of the source image's pixels, and
  rotating changes what those pixels mean; use `ImageField`'s `onEdit` to open a richer editor.

## ImageCropDialog

`requirements` take `accept` (default PNG, JPEG or WebP), `maxSize`, `minWidth`, `minHeight` and
`validate(file, { width, height })`. The dialog refuses a file in place with the reason, and
`onReject` receives each refusal.

`onSave(change, { signal, setProgress })` has the cropped `blob`, its `type`, `width` and `height`,
the `original` file, the `crop` and the `source` dimensions. Save shows pending until the promise
settles, then ✓ and the dialog closes. `setProgress(0–1)` shows an upload bar. Cancel or Esc aborts
`signal`. If the promise rejects, the dialog stays open and shows the error's message; write it for
the person.

`output` sets `width`, `height`, `type` and `quality`. With one dimension the other follows the
crop's shape; with neither the image keeps the crop's own pixels.

## ImageField

```tsx
const schema = z.object({ cover: imageSchema({ required: true }) })   // "Add an image"

<form.AppField name="cover">
  {(field) => <field.ImageField label="Cover" aspect={1} requirements={{ minWidth: 512, minHeight: 512 }} />}
</form.AppField>
```

- **Value:** `string` for a saved image's URL, `ImageChange` for a new crop, `null` when empty. On
  submit, upload an `ImageChange` and leave a string alone. To upload as the dialog closes instead,
  pass `onSave`; a resolved URL becomes the value.
- **`onEdit(value)`:** shows an Edit button beside an image. The field does not know what it opens:
  open your own editor and set the value when it finishes.
- **Bare control:** `ImageInput`, for a `Field` you lay out yourself or a value you hold in state.
