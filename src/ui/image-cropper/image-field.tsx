import { Field as BaseField } from "@base-ui/react/field"
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type FocusEvent } from "react"
import { IconCrop, IconEdit, IconImage, IconTrash, IconUpload } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Button } from "../button/index.js"
import { Field } from "../field/index.js"
import { useBoundField, type FieldChrome } from "../form/context.js"
import type { ImageChange, ImageCropAspect, ImageCropOutput, ImageRejection, ImageRequirements } from "./crop.js"
import { ImageCropDialog, type ImageSaveContext } from "./image-crop-dialog.js"
import type { ImageCropAspectOption } from "./image-cropper.js"
import { imageCropperMessages } from "./messages.js"

/** An ImageField's value: the URL of a saved image, a new crop to upload on submit, or null when empty. */
export type ImageFieldValue = string | ImageChange | null

export interface ImageInputProps {
  /** The image. Pair with `onValueChange` to control it. */
  value?: ImageFieldValue
  /** The starting image when uncontrolled. */
  defaultValue?: ImageFieldValue
  /** Called when a crop is saved or the image removed. */
  onValueChange?: (value: ImageFieldValue) => void
  /** Width ÷ height the crop keeps, or `"free"`. Default `"free"`. */
  aspect?: ImageCropAspect
  /** Shapes to choose between in the dialog. */
  aspects?: readonly ImageCropAspectOption[]
  /** `round` shows a round thumbnail and crop. Default `rect`. */
  shape?: "rect" | "round"
  /** What an image must satisfy: types, bytes, minimum dimensions and the application's own check. */
  requirements?: ImageRequirements
  /** The cropped image: size in pixels, media type (default WebP) and quality. */
  output?: ImageCropOutput
  /** Show number fields in the dialog. Default true. */
  fields?: boolean
  /**
   * Upload as the dialog saves, with the run's `{ signal, setProgress }`. Resolve with a URL to
   * make it the value; otherwise the change itself is. Without it the change becomes the value
   * and the form's submit uploads it: the library never does.
   */
  onSave?: (change: ImageChange, context: ImageSaveContext) => unknown
  /** Show an Edit button beside an image, for a richer editor of the host's. The field does not know what it opens; set the value when it is done. */
  onEdit?: (value: Exclude<ImageFieldValue, null>) => void
  /** Called for each file refused by the requirements. */
  onReject?: (rejection: ImageRejection) => void
  /** The picture's text alternative. Default "Chosen image". */
  alt?: string
  /** Shows the image without its actions; it cannot be changed. */
  readOnly?: boolean
  disabled?: boolean
  /** Show the invalid state (set by ImageField when its error shows). */
  invalid?: boolean
  /** Name for a native form submission: a hidden input carries a URL value. */
  name?: string
  /** Called when focus leaves the control, for form libraries' touched state. */
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void
  /** Accessible name when no Field label names the control. */
  "aria-label"?: string
  /** Formatting and wording locale; defaults to the nearest LocaleProvider. */
  labels?: Partial<typeof imageCropperMessages.defaults>
  /** Layout only. */
  className?: string
}

const hasFiles = (event: DragEvent) => [...event.dataTransfer.types].includes("Files")

/** A URL for what the value shows; a blob's is revoked when the value changes. */
function usePreview(value: ImageFieldValue) {
  const blob = value && typeof value === "object" ? value.blob : null
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])
  return typeof value === "string" ? value || null : url
}

/**
 * An image as a form value: a thumbnail with Add, or Replace, Crop, Edit and Remove. Choosing an
 * image opens `ImageCropDialog`, and a file dropped on the thumbnail opens it ready to crop. The
 * library never uploads: the value is the new crop for the form to send, unless `onSave` uploads
 * as the dialog closes. `onEdit` hands the image to a host's own editor.
 */
export function ImageInput({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  aspect = "free",
  aspects,
  shape = "rect",
  requirements,
  output,
  fields,
  onSave,
  onEdit,
  onReject,
  alt,
  readOnly = false,
  disabled = false,
  invalid,
  name,
  onBlur,
  "aria-label": ariaLabel,
  labels,
  className,
}: ImageInputProps) {
  const t = useMessages(imageCropperMessages, { labels })
  const [value, setValue] = useControllable<ImageFieldValue>(valueProp, defaultValue, onValueChange)
  const src = usePreview(value)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)
  const primary = useRef<HTMLButtonElement>(null)
  const editable = !readOnly && !disabled
  const ratio = typeof aspect === "number" ? aspect : 1
  const original = value && typeof value === "object" ? value.original : null

  const openWith = (next: File | null) => {
    setFile(next)
    setOpen(true)
  }
  const save = async (change: ImageChange, context: ImageSaveContext) => {
    const saved = await onSave?.(change, context)
    if (context.signal.aborted) return
    setValue(typeof saved === "string" ? saved : change)
  }

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- a drop target only; the buttons are the controls
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx("fa-image-input", className)}
      data-invalid={invalid ? "" : undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.(event)
      }}
      onDragEnter={(event) => {
        if (!editable || !hasFiles(event)) return
        event.preventDefault()
        depth.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => {
        if (!editable || !hasFiles(event)) return
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
        const dropped = event.dataTransfer.files[0]
        if (!editable || !dropped) return
        event.preventDefault()
        openWith(dropped)
      }}
    >
      <span
        className="fa-image-input-tile"
        data-shape={shape}
        data-dragging={dragging ? "" : undefined}
        style={{ "--_aspect": ratio, "--_fit": Math.min(1, ratio) } as CSSProperties}
      >
        {src ? <img src={src} alt={alt ?? t.chosenImage} draggable={false} /> : <IconImage aria-label={t.noImage} />}
      </span>
      {readOnly ? null : (
        <div className="fa-image-input-actions">
          <Button ref={primary} size="sm" icon={<IconUpload />} disabled={disabled} aria-invalid={invalid || undefined} onClick={() => openWith(null)}>
            {src ? t.replace : t.addImage}
          </Button>
          {original ? (
            <Button size="sm" variant="ghost" icon={<IconCrop />} disabled={disabled} onClick={() => openWith(original)}>
              {t.crop}
            </Button>
          ) : null}
          {onEdit && value ? (
            <Button size="sm" variant="ghost" icon={<IconEdit />} disabled={disabled} onClick={() => onEdit(value)}>
              {t.edit}
            </Button>
          ) : null}
          {src ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<IconTrash />}
              disabled={disabled}
              onClick={() => {
                setValue(null)
                // This button is about to go: keep focus in the field (R20.3).
                primary.current?.focus()
              }}
            >
              {t.remove}
            </Button>
          ) : null}
        </div>
      )}
      {name ? <input type="hidden" name={name} value={typeof value === "string" ? value : ""} /> : null}
      {/* The dialog's controls are not this field's: its error and label stop here. */}
      <BaseField.Root className="fa-image-input-dialog">
        <ImageCropDialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) setFile(null)
          }}
          file={file}
          aspect={aspect}
          aspects={aspects}
          shape={shape}
          requirements={requirements}
          output={output}
          fields={fields}
          onSave={save}
          onReject={onReject}
          labels={labels}
        />
      </BaseField.Root>
    </div>
  )
}

export interface ImageFieldProps extends FieldChrome, Omit<ImageInputProps, "value" | "defaultValue" | "onValueChange" | "name" | "invalid" | "onBlur" | "className" | "disabled"> {}

/** ImageInput bound to an `ImageFieldValue` form field. Pair it with `imageSchema()`. */
export function ImageField({ label, hint, warning, optional, required, aside, className, disabled, ...control }: ImageFieldProps) {
  const { field, error, root } = useBoundField<ImageFieldValue>()
  return (
    <Field {...root} label={label} hint={hint} warning={warning} optional={optional} required={required} aside={aside} className={className} disabled={disabled} nativeLabel={false}>
      <ImageInput {...control} name={field.name} value={field.state.value} onValueChange={(next) => field.handleChange(next)} onBlur={field.handleBlur} disabled={disabled} invalid={Boolean(error)} />
    </Field>
  )
}
