import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent, type ReactElement, type ReactNode } from "react"
import { IconTrash, IconZoomIn, IconZoomOut } from "../../icons/generated/icons.js"
import { useMessages } from "../../lib/i18n/index.js"
import { numberFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button, FEEDBACK_HOLD_MS, type ButtonStatus } from "../button/index.js"
import { Dialog } from "../dialog/index.js"
import { FileDrop } from "../file-drop/index.js"
import { Progress } from "../progress/index.js"
import { Slider } from "../slider/index.js"
import { Avatar } from "./avatar.js"
import {
  AVATAR_ACCEPT,
  checkAvatarFile,
  clampView,
  cropFor,
  cropImage,
  cropSide,
  describeAvatarRequirements,
  fitView,
  maxZoomFor,
  type AvatarChange,
  type AvatarImageSize,
  type AvatarOutput,
  type AvatarRejection,
  type AvatarRequirements,
  type AvatarView,
} from "./avatar-image.js"
import { avatarEditorMessages } from "./messages.js"

/** Mirrors --duration-slower: the ✓ draws before the dialog leaves. */
const SUCCESS_BEAT_MS = 450
const ZOOM_STEP = 1.1

/** What `onSave` receives besides the change: the run's abort signal and a progress reporter. */
export interface AvatarSaveContext {
  /** Aborts when the person cancels or closes the dialog while the save runs; pass it to `fetch`. */
  signal: AbortSignal
  /** Report upload progress from 0 to 1 (the dialog shows a bar); `null` hides it again. */
  setProgress: (fraction: number | null) => void
}

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

interface Picked {
  file: File
  /** Object URL for the preview, revoked when the photo is replaced or the dialog resets. */
  url: string
  image: AvatarImageSize
}

const hasFiles = (event: DragEvent) => [...event.dataTransfer.types].includes("Files")

/**
 * Change a person's photo: drop, browse for or paste an image, position it in the round crop
 * (drag, pinch, wheel or keys; the slider zooms) and save. The dialog checks the file against
 * `requirements` before it can be cropped and hands the cropped square to `onSave`; the
 * application uploads it. Outside presses do not close it, so a crop is never lost by a stray
 * click; Cancel and Esc abort a save that is still running.
 */
export function AvatarDialog({
  trigger,
  open: openProp,
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
  const locale = useLocale()
  const instructionsId = useId()
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [view, setView] = useState<AvatarView>({ zoom: 1, centerX: 0, centerY: 0 })
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState("")
  const [progress, setProgress] = useState<number | null>(null)
  const [saveStatus, setSaveStatus] = useState<ButtonStatus>("idle")
  const [removeStatus, setRemoveStatus] = useState<ButtonStatus>("idle")
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)
  /** The save or removal in flight; replaced or cleared when it ends, is aborted or the dialog closes. */
  const run = useRef<AbortController | null>(null)
  /** The latest file check; an older one that finishes later is dropped. */
  const attempt = useRef(0)
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const later = (callback: () => void, ms: number) => timers.current.push(setTimeout(callback, ms))

  const busy = saveStatus === "pending" || saveStatus === "success" || removeStatus === "pending" || removeStatus === "success"
  const maxZoom = picked ? maxZoomFor(picked.image, requirements) : 1

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
    const result = await checkAvatarFile(chosen, requirements, locale)
    if (id !== attempt.current) return
    setChecking(false)
    if (!result.ok) {
      setMessage(result.rejection.message)
      onReject?.(result.rejection)
      return
    }
    setPicked({ file: chosen, url: URL.createObjectURL(chosen), image: result.image })
    setView(fitView(result.image))
  }
  const takeRef = useRef(take)
  takeRef.current = take

  // A file handed in (dropped on an EditableAvatar) loads as the dialog opens.
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
    if (!picked || busy || checking) return
    void perform(
      async (signal) => {
        const crop = cropFor(view, picked.image)
        const size = output?.size ?? 512
        let blob: Blob
        try {
          blob = await cropImage(picked.file, crop, output)
        } catch {
          throw new Error(messages.saveFailed)
        }
        const change: AvatarChange = { blob, type: blob.type, width: size, height: size, original: picked.file, crop, source: picked.image }
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

  const percent = numberFormat(locale, { style: "percent", maximumFractionDigits: 0 })

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      onOpenChangeComplete={(next) => (next ? undefined : reset())}
      disablePointerDismissal
    >
      {trigger ? <Dialog.Trigger render={trigger} /> : null}
      <Dialog.Popup size="md">
        <Dialog.Header title={title ?? messages.changePhoto} subtitle={name} />
        <Dialog.Body>
          {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- a drop target only; the file input and crop area are the controls */}
          <div
            className="fa-avatar-dialog"
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
            <div className="fa-avatar-crop" data-cropping={picked ? "" : undefined} data-dragging={dragging ? "" : undefined}>
              {picked ? (
                <CropArea
                  picked={picked}
                  view={view}
                  maxZoom={maxZoom}
                  onView={setView}
                  disabled={busy}
                  label={messages.cropLabel}
                  roleDescription={messages.cropRole}
                  describedBy={instructionsId}
                />
              ) : (
                <Avatar name={name} src={src} className="fa-avatar-crop-current" />
              )}
              {dragging ? (
                <span className="fa-avatar-crop-drop" aria-hidden>
                  {messages.dropPhoto}
                </span>
              ) : null}
            </div>
            <span id={instructionsId} hidden>
              {messages.cropInstructions}
            </span>
            <div className="fa-avatar-zoom" data-base-ui-swipe-ignore="">
              <IconZoomOut aria-hidden />
              <Slider
                aria-label={messages.zoom}
                min={1}
                max={maxZoom > 1 ? maxZoom : 2}
                step={0.01}
                value={picked ? view.zoom : 1}
                onValueChange={(zoom) => picked && setView((current) => clampView({ ...current, zoom: zoom as number }, picked.image, maxZoom))}
                format={(zoom) => percent.format(zoom)}
                disabled={!picked || maxZoom <= 1 || busy}
                bubble="never"
                size="sm"
              />
              <IconZoomIn aria-hidden />
            </div>
            <FileDrop
              variant="compact"
              multiple={false}
              accept={requirements.accept ?? AVATAR_ACCEPT}
              hint=""
              disabled={busy}
              invalid={Boolean(message) && saveStatus !== "error" && removeStatus !== "error"}
              aria-label={messages.choosePhoto}
              // The dialog screens files itself, so the type reason names formats rather than MIME types.
              onFiles={(accepted, rejected) => void take([...accepted, ...rejected.map((rejection) => rejection.file)])}
            />
            {/* One line, stacked: the limits, replaced in place by a reason or the upload bar. */}
            <div className="fa-avatar-dialog-status" data-showing={progress !== null ? "progress" : message ? "message" : "hint"}>
              <p className="fa-avatar-dialog-hint">{describeAvatarRequirements(requirements, locale, messages)}</p>
              <p className="fa-avatar-dialog-message" aria-live="polite">
                {message}
              </p>
              {progress === null ? null : <Progress value={progress * 100} size="sm" showValue={false} aria-label={messages.savingPhoto} />}
            </div>
          </div>
        </Dialog.Body>
        <Dialog.Footer
          start={
            onRemove && src ? (
              <Button
                variant="ghost"
                icon={<IconTrash />}
                status={removeStatus}
                pendingLabel={messages.removing}
                disabled={busy && removeStatus === "idle"}
                onClick={remove}
              >
                {messages.removePhoto}
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
            disabledReason={picked ? undefined : messages.choosePhotoFirst}
            onClick={save}
          >
            {messages.save}
          </Button>
        </Dialog.Footer>
      </Dialog.Popup>
    </Dialog.Root>
  )
}

interface CropAreaProps {
  picked: Picked
  view: AvatarView
  maxZoom: number
  onView: (view: AvatarView) => void
  disabled: boolean
  label: string
  roleDescription: string
  describedBy: string
}

/**
 * The photo under the round mask. The crop square fills the frame, so the image is placed in
 * percentages of the square's side and never measured. Geometry is physical: a photo does
 * not mirror in right-to-left languages, so the arrow keys move it the way they point.
 */
function CropArea({ picked, view, maxZoom, onView, disabled, label, roleDescription, describedBy }: CropAreaProps) {
  const ref = useRef<HTMLDivElement>(null)
  const latest = useRef(view)
  latest.current = view
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ zoom: number; distance: number } | null>(null)
  const { image } = picked

  const update = (next: AvatarView) => {
    const clamped = clampView(next, image, maxZoom)
    // Several moves can arrive before the next render; each builds on the last.
    latest.current = clamped
    onView(clamped)
  }
  const updateRef = useRef(update)
  updateRef.current = update

  // Wheel and trackpad pinch zoom; a non-passive listener, so the dialog body does not scroll.
  useEffect(() => {
    const element = ref.current
    if (!element || disabled) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const zoom = latest.current.zoom * Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015))
      updateRef.current({ ...latest.current, zoom })
    }
    element.addEventListener("wheel", wheel, { passive: false })
    return () => element.removeEventListener("wheel", wheel)
  }, [disabled])

  const distance = () => {
    const [a, b] = [...pointers.current.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) pinch.current = { zoom: latest.current.zoom, distance: distance() || 1 }
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const current = latest.current
    if (pointers.current.size >= 2 && pinch.current) {
      update({ ...current, zoom: (pinch.current.zoom * distance()) / pinch.current.distance })
      return
    }
    // Screen pixels to source pixels: the frame shows one crop side across its width.
    const scale = cropSide(image, current.zoom) / (ref.current?.clientWidth || 1)
    update({
      ...current,
      centerX: current.centerX - (event.clientX - previous.x) * scale,
      centerY: current.centerY - (event.clientY - previous.y) * scale,
    })
  }
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return
    const current = latest.current
    const step = cropSide(image, current.zoom) * (event.shiftKey ? 0.1 : 0.02)
    const moves: Record<string, AvatarView> = {
      ArrowLeft: { ...current, centerX: current.centerX + step },
      ArrowRight: { ...current, centerX: current.centerX - step },
      ArrowUp: { ...current, centerY: current.centerY + step },
      ArrowDown: { ...current, centerY: current.centerY - step },
      "+": { ...current, zoom: current.zoom * ZOOM_STEP },
      "=": { ...current, zoom: current.zoom * ZOOM_STEP },
      "-": { ...current, zoom: current.zoom / ZOOM_STEP },
      "_": { ...current, zoom: current.zoom / ZOOM_STEP },
      "0": fitView(image),
    }
    const next = moves[event.key]
    if (!next) return
    event.preventDefault()
    update(next)
  }

  const side = cropSide(image, view.zoom)
  const share = (pixels: number) => `${(pixels / side) * 100}%`
  return (
    <div
      ref={ref}
      role="application"
      aria-roledescription={roleDescription}
      aria-label={label}
      aria-describedby={describedBy}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className="fa-avatar-crop-area"
      data-base-ui-swipe-ignore=""
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      <img
        className="fa-avatar-crop-image"
        src={picked.url}
        alt=""
        draggable={false}
        style={{
          width: share(image.width),
          height: share(image.height),
          left: share(side / 2 - view.centerX), // logical:allow photo geometry does not mirror
          top: share(side / 2 - view.centerY),
        }}
      />
      <span className="fa-avatar-crop-mask" aria-hidden />
    </div>
  )
}
