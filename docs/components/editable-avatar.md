# Editable avatar

`glass-ux/avatar` · [Live component catalogue](https://dastari.github.io/glass-ux/)

A person's photo they can change where they see it. `EditableAvatar` puts a round edit button
on the top corner of an `xl` (56px) or `2xl` (96px) avatar; smaller avatars are the button
themselves. The button opens `AvatarDialog`, where people drop, browse for or paste a photo,
position it in a round crop and save. Dropping a photo on the avatar opens the dialog with it.
The library never uploads anything: `onSave` receives the cropped image and the application
stores it.

```tsx
import { EditableAvatar } from "glass-ux/avatar"

<EditableAvatar
  name={user.name}
  src={user.photoUrl}
  requirements={{ maxSize: 5 * 1024 * 1024, minWidth: 256, minHeight: 256 }}
  onSave={async ({ blob }, { signal, setProgress }) => {
    const { url } = await uploadPhoto(blob, { signal, onProgress: setProgress })
    setUser({ ...user, photoUrl: url })
  }}
  onRemove={() => removePhoto()}
/>
```

- **Requirements:** `accept` (default PNG, JPEG or WebP), `maxSize` in bytes, `minWidth` and
  `minHeight` in pixels, and `validate(file, { width, height })` for the application's own
  check (return the reason to refuse). The dialog lists them under the drop zone and refuses a
  photo in place with the reason; `onReject` receives each refusal. The crop never zooms past
  the larger minimum, so the saved square always has enough source pixels.
- **Output:** `output={{ size, type, quality }}`, default a 512-pixel WebP at 0.9. Browsers
  that cannot encode the type give PNG; `change.type` says which.
- **`onSave(change, { signal, setProgress })`:** `change` has the cropped `blob`, its `type`,
  `width` and `height`, the `original` file, the `crop` square in the original's pixels and
  the `source` dimensions, so an application can upload the original and crop it on the
  server instead. The Save button shows pending until the promise settles, then ✓ and the
  dialog closes. `setProgress(0–1)` shows an upload bar. Cancel or Esc aborts `signal`. If
  the promise rejects, the dialog stays open and shows the error's message; write it for the
  person.
- **`onRemove`:** runs the same way from a Remove photo button, shown only with `onRemove`
  and a current `src`.
- **Shown at once:** after a save or removal the avatar shows the new photo (or initials)
  until `src` changes to the application's URL for it.
- **Crop:** drag, pinch or scroll to position the photo, or focus it and use the arrow keys
  (Shift for larger steps), plus and minus to zoom and 0 to fit. The slider zooms too. The
  photo's geometry does not mirror in right-to-left languages.
- **Placement and size:** `editPlacement="top-end"` (default) or `"top-start"`; `size`
  defaults to `2xl`. `disabled` turns editing off.
- **`AvatarDialog` on its own:** the same dialog for a "Change photo" menu item or button,
  with `trigger` or controlled `open` and `onOpenChange`, and `file` to start from a photo the
  page already has.
- **Helpers:** `checkAvatarFile`, `readImageSize`, `cropImage` and
  `describeAvatarRequirements` work without React, for an application's own photo flows.
