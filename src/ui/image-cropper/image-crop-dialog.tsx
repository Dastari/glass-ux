import { useEffect, useRef, useState, type DragEvent, type ReactElement, type ReactNode } from "react"
import { IconTrash } from "../../icons/generated/icons.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { cx } from "../../lib/cx.js"
import { Button, FEEDBACK_HOLD_MS, type ButtonStatus } from "../button/index.js"
import { Dialog } from "../dialog/index.js"
import { FileDrop } from "../file-drop/index.js"
import { Progress } from "../progress/index.js"
import { checkImageFile, cropToBlob, describeImageRequirements, IMAGE_ACCEPT, outputSize, type ImageChange, type ImageCropAspect, type ImageCropOutput, type ImageRejection, type ImageRequirements, type ImageSize } from "./crop.js"
import { ImageCropper, type ImageCropAspectOption, type ImageCropperActions } from "./image-cropper.js"
import { imageCropperMessages } from "./messages.js"

/** Mirrors --duration-slower: the ✓ draws before the dialog leaves. */
const SUCCESS_BEAT_MS = 450

/** What `onSave` receives besides the change: the run's abort signal and a progress reporter. */
export interface ImageSaveContext {
  /** Aborts when the person cancels or closes the dialog while the save runs; pass it to `fetch`. */
  signal: AbortSignal
  /** Report upload progress from 0 to 1 (the dialog shows a bar); `null` hides it again. */
  setProgress: (fraction: number | null) => void
}

export interface ImageCropDialogProps {
  /** The element that opens it. Omit when controlling `open`. */
  trigger?: ReactElement
  open?: boolean
  defaultOpen?: boolean
  /** Called with the next open state when the trigger opens it, Cancel, Esc or the close button dismisses it, or it closes after a save or removal. Pair with `open` to control it. */
  onOpenChange?: (open: boolean) => void
  /** A file to start from when the dialog opens, such as one dropped on the page. */
  file?: File | null
  /** What an image must satisfy: types, bytes, minimum dimensions and the application's own check. */
  requirements?: ImageRequirements
  /** The cropped image: size in pixels, media type (default WebP) and quality. */
  output?: ImageCropOutput
  /** Width ÷ height the crop keeps, or `"free"`. Default `"free"`. */
  aspect?: ImageCropAspect
  /** Shapes to choose between. */
  aspects?: readonly ImageCropAspectOption[]
  /** `round` dims the corners a round picture will not show. */
  shape?: "rect" | "round"
  /** Show number fields for the crop's position and size. Default true. */
  fields?: boolean
  /**
   * Save the image: upload `change.blob` (or `change.original` with `change.crop`). The dialog
   * shows pending until the promise settles, then ✓ and closes. If it rejects, the dialog stays
   * open with the error's message (write it for the person) or a generic one.
   */
  onSave: (change: ImageChange, context: ImageSaveContext) => unknown
  /** Remove the current image; runs like `onSave`. Without it there is no Remove button. */
  onRemove?: () => unknown
  /** Called for each file refused by the requirements, with the reason shown in the dialog. */
  onReject?: (rejection: ImageRejection) => void
  /** Dialog title. Default "Change image". */
  title?: ReactNode
  /** The line under the title. */
  subtitle?: ReactNode
  /** Shown in the frame until an image is chosen, such as the current one. */
  placeholder?: ReactNode
  /** Wording overrides. */
  labels?: Partial<typeof imageCropperMessages.defaults>
  /** Layout only, on the dialog's content. */
  className?: string
}

interface Picked {
  file: File
  /** Object URL for the preview, revoked when the image is replaced or the dialog resets. */
  url: string
  image: ImageSize
}

const hasFiles = (event: DragEvent) => [...event.dataTransfer.types].includes("Files")

/**
 * Choose an image and crop it: drop, browse for or paste a file, position it (see
 * `ImageCropper`) and save. The dialog checks the file against `requirements` before it can be
 * cropped and hands the result to `onSave`; the application uploads it. Outside presses do not
 * close it, so a crop is never lost by a stray click; Cancel and Esc abort a save that is still
 * running.
 */
export function ImageCropDialog({
  trigger,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  file,
  requirements = {},
  output,
  aspect,
  aspects,
  shape,
  fields,
  onSave,
  onRemove,
  onReject,
  title,
  subtitle,
  placeholder,
  labels,
  className,
}: ImageCropDialogProps) {
  const messages = useMessages(imageCropperMessages, { labels })
  const locale = useLocale()
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState("")
  const [progress, setProgress] = useState<number | null>(null)
  const [saveStatus, setSaveStatus] = useState<ButtonStatus>("idle")
  const [removeStatus, setRemoveStatus] = useState<ButtonStatus>("idle")
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)
  const cropper = useRef<ImageCropperActions>(null)
  /** The save or removal in flight; replaced or cleared when it ends, is aborted or the dialog closes. */
  const run = useRef<AbortController | null>(null)
  /** The latest file check; an older one that finishes later is dropped. */
  const attempt = useRef(0)
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const later = (callback: () => void, ms: number) => timers.current.push(setTimeout(callback, ms))

  const busy = saveStatus === "pending" || saveStatus === "success" || removeStatus === "pending" || removeStatus === "success"

  useEffect(() => () => (picked ? URL.revokeObjectURL(picked.url) : undefined), [picked])
  useEffect(
    () => () => {
      run.current?.abort()
      for (const timer of timers.current) clearTimeout(timer)
    },
    [],
  )

  const take = async (files: File[]) => {
    const chosen = files[0]
    if (!chosen || busy) return
    const id = ++attempt.current
    setChecking(true)
    setMessage("")
    const result = await checkImageFile(chosen, requirements, locale, messages)
    if (id !== attempt.current) return
    setChecking(false)
    if (!result.ok) {
      setMessage(result.rejection.message)
      onReject?.(result.rejection)
      return
    }
    setPicked({ file: chosen, url: URL.createObjectURL(chosen), image: result.image })
  }
  const takeRef = useRef(take)
  takeRef.current = take

  // A file handed in (dropped on a tile or an avatar) loads as the dialog opens.
  useEffect(() => {
    if (open && file) void takeRef.current([file])
  }, [open, file])

  // Paste an image from the clipboard while the dialog is open.
  useEffect(() => {
    if (!open) return
    const paste = (event: ClipboardEvent) => {
      const images = [...(event.clipboardData?.files ?? [])].filter((item) => item.type.startsWith("image/"))
      if (images.length === 0) return
      event.preventDefault()
      void takeRef.current(images)
    }
    document.addEventListener("paste", paste)
    return () => document.removeEventListener("paste", paste)
  }, [open])

  const reset = () => {
    attempt.current += 1
    run.current = null
    for (const timer of timers.current) clearTimeout(timer)
    timers.current = []
    setPicked(null)
    setChecking(false)
    setMessage("")
    setProgress(null)
    setSaveStatus("idle")
    setRemoveStatus("idle")
  }

  const close = () => {
    run.current?.abort()
    run.current = null
    attempt.current += 1
    setOpen(false)
  }

  /** Run a save or removal: pending, then ✓ and close, or ✕ with the reason on the message line. */
  const perform = async (action: (signal: AbortSignal) => unknown, setStatus: (status: ButtonStatus) => void, failure: string) => {
    const controller = new AbortController()
    run.current = controller
    const live = () => run.current === controller && !controller.signal.aborted
    setMessage("")
    setProgress(null)
    setStatus("pending")
    try {
      await action(controller.signal)
      if (!live()) return
      setStatus("success")
      setProgress(null)
      later(() => {
        run.current = null
        setOpen(false)
      }, SUCCESS_BEAT_MS)
    } catch (error) {
      if (!live()) return
      run.current = null
      setStatus("error")
      setProgress(null)
      setMessage(error instanceof Error && error.message ? error.message : failure)
      later(() => setStatus("idle"), FEEDBACK_HOLD_MS)
    }
  }

  const save = () => {
    const crop = cropper.current?.crop()
    if (!picked || !crop || busy || checking) return
    void perform(
      async (signal) => {
        let blob: Blob
        try {
          blob = await cropToBlob(picked.file, crop, output)
        } catch {
          throw new Error(messages.saveFailed)
        }
        const change: ImageChange = { blob, type: blob.type, ...outputSize(crop, output), original: picked.file, crop, source: picked.image }
        await onSave(change, {
          signal,
          setProgress: (fraction) => {
            if (!signal.aborted) setProgress(fraction === null ? null : Math.min(1, Math.max(0, fraction)))
          },
        })
      },
      setSaveStatus,
      messages.saveFailed,
    )
  }

  const remove = () => {
    if (!onRemove || busy) return
    void perform(() => onRemove(), setRemoveStatus, messages.removeFailed)
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      onOpenChangeComplete={(next) => (next ? undefined : reset())}
      disablePointerDismissal
    >
      {trigger ? <Dialog.Trigger render={trigger} /> : null}
      <Dialog.Popup size="md">
        <Dialog.Header title={title ?? messages.changeImage} subtitle={subtitle} />
        <Dialog.Body>
          {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- a drop target only; the file input and crop area are the controls */}
          <div
            className={cx("fa-image-crop-dialog", className)}
            onDragEnter={(event) => {
              if (busy || !hasFiles(event)) return
              event.preventDefault()
              depth.current += 1
              setDragging(true)
            }}
            onDragOver={(event) => {
              if (busy || !hasFiles(event)) return
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
              // The drop zone below handles its own drops.
              if (busy || event.defaultPrevented) return
              event.preventDefault()
              void take([...event.dataTransfer.files])
            }}
          >
            <ImageCropper
              src={picked?.url}
              image={picked?.image}
              aspect={aspect ?? "free"}
              aspects={aspects}
              shape={shape}
              minWidth={requirements.minWidth}
              minHeight={requirements.minHeight}
              fields={fields}
              disabled={busy}
              placeholder={placeholder}
              overlay={dragging ? messages.dropImage : undefined}
              actionsRef={cropper}
              labels={labels}
            />
            <FileDrop
              variant="compact"
              multiple={false}
              accept={requirements.accept ?? IMAGE_ACCEPT}
              hint=""
              disabled={busy}
              invalid={Boolean(message) && saveStatus !== "error" && removeStatus !== "error"}
              aria-label={messages.chooseImage}
              // The dialog screens files itself, so the type reason names formats rather than MIME types.
              onFiles={(accepted, rejected) => void take([...accepted, ...rejected.map((rejection) => rejection.file)])}
            />
            {/* One line, stacked: the limits, replaced in place by a reason or the upload bar. */}
            <div className="fa-image-crop-dialog-status" data-showing={progress !== null ? "progress" : message ? "message" : "hint"}>
              <p className="fa-image-crop-dialog-hint">{describeImageRequirements(requirements, locale, messages)}</p>
              <p className="fa-image-crop-dialog-message" aria-live="polite">
                {message}
              </p>
              {progress === null ? null : <Progress value={progress * 100} size="sm" showValue={false} aria-label={messages.savingImage} />}
            </div>
          </div>
        </Dialog.Body>
        <Dialog.Footer
          start={
            onRemove ? (
              <Button
                variant="ghost"
                icon={<IconTrash />}
                status={removeStatus}
                pendingLabel={messages.removing}
                disabled={busy && removeStatus === "idle"}
                onClick={remove}
              >
                {messages.removeImage}
              </Button>
            ) : undefined
          }
        >
          <Button onClick={close}>{messages.cancel}</Button>
          <Button
            variant="primary"
            status={saveStatus}
            pendingLabel={messages.saving}
            successLabel={messages.saved}
            errorLabel={messages.notSaved}
            disabled={checking || (busy && saveStatus === "idle")}
            disabledReason={picked ? undefined : messages.chooseImageFirst}
            onClick={save}
          >
            {messages.save}
          </Button>
        </Dialog.Footer>
      </Dialog.Popup>
    </Dialog.Root>
  )
}
