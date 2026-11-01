import { useMemo, type ReactElement, type ReactNode } from "react"
import { useMessages } from "../../lib/i18n/index.js"
import { ImageCropDialog, type ImageSaveContext } from "../image-cropper/image-crop-dialog.js"
import type { imageCropperMessages } from "../image-cropper/messages.js"
import { Avatar } from "./avatar.js"
import type { AvatarChange, AvatarOutput, AvatarRejection, AvatarRequirements } from "./avatar-image.js"
import { avatarEditorMessages } from "./messages.js"

/** What `onSave` receives besides the change: the run's abort signal and a progress reporter. */
export interface AvatarSaveContext extends ImageSaveContext {}

export interface AvatarDialogProps {
  /** The element that opens it. Omit when controlling `open`. */
  trigger?: ReactElement
  open?: boolean
  defaultOpen?: boolean
  /** Called with the next open state when the trigger opens it, Cancel, Esc or the close button dismisses it, or it closes after a save or removal. Pair with `open` to control it. */
  onOpenChange?: (open: boolean) => void
  /** The person's (or account's) name: the subtitle, and the initials when there is no photo. */
  name: string
  /** The current photo, shown until a new one is chosen. */
  src?: string
  /** A file to start from when the dialog opens, such as one dropped on the page. */
  file?: File | null
  /** What a photo must satisfy: types, bytes, minimum dimensions and the application's own check. */
  requirements?: AvatarRequirements
  /** The cropped image: size in pixels (default 512), media type (default WebP) and quality. */
  output?: AvatarOutput
  /**
   * Save the photo: upload `change.blob` (or `change.original` with `change.crop`). The dialog
   * shows pending until the promise settles, then ✓ and closes. If it rejects, the dialog stays
   * open with the error's message (write it for the person) or a generic one.
   */
  onSave: (change: AvatarChange, context: AvatarSaveContext) => unknown
  /** Remove the current photo; runs like `onSave`. Without it, or without `src`, there is no Remove button. */
  onRemove?: () => unknown
  /** Called for each file refused by the requirements, with the reason shown in the dialog. */
  onReject?: (rejection: AvatarRejection) => void
  /** Dialog title. Default "Change photo". */
  title?: ReactNode
}

/**
 * Change a person's photo: drop, browse for or paste an image, position it in the round crop
 * (drag, pinch, wheel or keys; the slider zooms) and save. The dialog checks the file against
 * `requirements` before it can be cropped and hands the cropped square to `onSave`; the
 * application uploads it. Outside presses do not close it, so a crop is never lost by a stray
 * click; Cancel and Esc abort a save that is still running. A square, round preset of
 * `ImageCropDialog` that speaks of photos.
 */
export function AvatarDialog({
  trigger,
  open,
  defaultOpen = false,
  onOpenChange,
  name,
  src,
  file,
  requirements = {},
  output,
  onSave,
  onRemove,
  onReject,
  title,
}: AvatarDialogProps) {
  const messages = useMessages(avatarEditorMessages)
  const labels = useMemo<Partial<typeof imageCropperMessages.defaults>>(
    () => ({
      ...messages,
      changeImage: messages.changePhoto,
      chooseImage: messages.choosePhoto,
      chooseImageFirst: messages.choosePhotoFirst,
      dropImage: messages.dropPhoto,
      removeImage: messages.removePhoto,
      savingImage: messages.savingPhoto,
    }),
    [messages],
  )
  const size = output?.size ?? 512
  return (
    <ImageCropDialog
      trigger={trigger}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      file={file}
      requirements={requirements}
      output={{ width: size, height: size, type: output?.type, quality: output?.quality }}
      aspect={1}
      shape="round"
      fields={false}
      onSave={({ crop, ...change }, context) => onSave({ ...change, crop: { x: crop.x, y: crop.y, size: crop.width } }, context)}
      onRemove={onRemove && src ? onRemove : undefined}
      onReject={onReject}
      title={title ?? messages.changePhoto}
      subtitle={name}
      placeholder={<Avatar name={name} src={src} className="fa-avatar-crop-current" />}
      labels={labels}
      className="fa-avatar-dialog"
    />
  )
}
