import { useEffect, useRef, useState, type ComponentProps, type DragEvent, type ReactNode } from "react"
import { IconEdit } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { Button } from "../button/index.js"
import { Avatar, type AvatarSize, type Presence } from "./avatar.js"
import { AvatarDialog, type AvatarSaveContext } from "./avatar-dialog.js"
import type { AvatarChange, AvatarOutput, AvatarRejection, AvatarRequirements } from "./avatar-image.js"
import { avatarEditorMessages } from "./messages.js"

export interface EditableAvatarProps extends Omit<ComponentProps<"span">, "children" | "onDragEnter" | "onDragOver" | "onDragLeave" | "onDrop"> {
  /** The person's (or account's) name: the initials, tint and accessible names. */
  name: string
  /** The current photo URL. */
  src?: string
  /** Default `2xl` (96px). From `xl` up an edit button sits on the corner; smaller avatars are the button themselves. */
  size?: AvatarSize
  /** The person’s live availability, drawn as a presence indicator. */
  presence?: Presence
  /** The edit button's corner. Default `top-end` (top right in left-to-right languages). */
  editPlacement?: "top-end" | "top-start"
  /** What a photo must satisfy: types, bytes, minimum dimensions and the application's own check. */
  requirements?: AvatarRequirements
  /** The cropped image: size in pixels (default 512), media type (default WebP) and quality. */
  output?: AvatarOutput
  /**
   * Save the photo (see `AvatarDialog`). Once it resolves the avatar shows the new photo
   * straight away, until `src` changes to the application's URL for it.
   */
  onSave: (change: AvatarChange, context: AvatarSaveContext) => unknown
  /** Remove the photo; the avatar shows initials until `src` changes. Without it there is no Remove button. */
  onRemove?: () => unknown
  /** Called for each file refused by the requirements. */
  onReject?: (rejection: AvatarRejection) => void
  /** Dialog title. Default "Change photo". */
  dialogTitle?: ReactNode
  disabled?: boolean
}

const hasFiles = (event: DragEvent) => [...event.dataTransfer.types].includes("Files")

/**
 * An avatar the person can change: the edit button (or, below `xl`, the avatar itself)
 * opens `AvatarDialog`, and a photo dropped on the avatar opens it with that photo ready to
 * crop. The application saves the result in `onSave`.
 */
export function EditableAvatar({
  name,
  src,
  size = "2xl",
  presence,
  editPlacement = "top-end",
  requirements,
  output,
  onSave,
  onRemove,
  onReject,
  dialogTitle,
  disabled = false,
  className,
  ...rest
}: EditableAvatarProps) {
  const messages = useMessages(avatarEditorMessages)
  const [open, setOpen] = useState(false)
  const [dropped, setDropped] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)

  // A saved or removed photo shows at once, until the application passes a different `src`.
  const [optimistic, setOptimistic] = useState<{ over: string | undefined; url: string | null } | null>(null)
  if (optimistic && optimistic.over !== src) setOptimistic(null)
  useEffect(() => () => (optimistic?.url ? URL.revokeObjectURL(optimistic.url) : undefined), [optimistic])
  const shown = optimistic ? (optimistic.url ?? undefined) : src
  const latestSrc = useRef(src)
  latestSrc.current = src

  const save = async (change: AvatarChange, context: AvatarSaveContext) => {
    const over = latestSrc.current
    await onSave(change, context)
    if (!context.signal.aborted && latestSrc.current === over) setOptimistic({ over, url: URL.createObjectURL(change.blob) })
  }
  const remove = onRemove
    ? async () => {
        const over = latestSrc.current
        await onRemove()
        if (latestSrc.current === over) setOptimistic({ over, url: null })
      }
    : undefined

  const label = messages.changePhotoFor(name)
  const badge = size === "xl" || size === "2xl"
  const openWith = (file: File | null) => {
    setDropped(file)
    setOpen(true)
  }

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- a drop target only; the button is the control
    <span
      {...rest}
      className={cx("fa-avatar-editable", className)}
      data-size={size}
      data-placement={editPlacement}
      data-whole={badge ? undefined : ""}
      data-dragging={dragging ? "" : undefined}
      onDragEnter={(event) => {
        if (disabled || !hasFiles(event)) return
        event.preventDefault()
        depth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => {
        if (disabled || !hasFiles(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setDragging(false)
      }}
      onDrop={(event) => {
        depth.current = 0
        setDragging(false)
        const file = event.dataTransfer.files[0]
        if (disabled || !file) return
        event.preventDefault()
        openWith(file)
      }}
    >
      {badge ? (
        <>
          <Avatar name={name} src={shown} size={size} presence={presence} />
          <Button
            className="fa-avatar-edit"
            size={size === "2xl" ? "sm" : "xs"}
            shape="circle"
            icon={<IconEdit />}
            aria-label={label}
            disabled={disabled}
            onClick={() => openWith(null)}
          />
        </>
      ) : (
        <Button className="fa-avatar-edit-whole" variant="ghost" shape="circle" aria-label={label} tooltip={label} disabled={disabled} onClick={() => openWith(null)}>
          <Avatar name={name} src={shown} size={size} presence={presence} decorative />
          <span className="fa-avatar-edit-hint" aria-hidden>
            <IconEdit />
          </span>
        </Button>
      )}
      <AvatarDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setDropped(null)
        }}
        name={name}
        src={shown}
        file={dropped}
        requirements={requirements}
        output={output}
        onSave={save}
        onRemove={remove}
        onReject={onReject}
        title={dialogTitle}
      />
    </span>
  )
}
