import { Field as BaseField } from "@base-ui/react/field"
import { useRef, useState, type ComponentProps, type DragEvent, type ReactNode } from "react"
import { IconClose, IconFile, IconUpload } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button } from "../button/index.js"
import { Progress } from "../progress/index.js"
import { describeAccept, formatBytes, screenFiles, type FileRejection } from "./files.js"

export interface FileDropProps {
  /** Called with the files that fit the limits and the ones that do not (with reasons). */
  onFiles: (accepted: File[], rejected: FileRejection[]) => void
  /** Same syntax as <input accept>: ".msi,.exe" or "image/*". */
  accept?: string
  /** Bytes per file. */
  maxSize?: number
  /** Files allowed in total, counting `existing`. */
  maxFiles?: number
  /** Files already in the list (for maxFiles). */
  existing?: number
  /** Allows more than one selected value. */
  multiple?: boolean
  disabled?: boolean
  /** Invalid outside a Field. */
  invalid?: boolean
  /** The limits line. Default: built from maxSize and accept ("Max 500 MB per file · .msi or .exe"). */
  hint?: ReactNode
  /** Show the drag-over state without a drag (documentation and tests). */
  dragging?: boolean
  /** full: the dashed tile. compact: one control-height row for toolbars and table rows. */
  variant?: "full" | "compact"
  /** Accessible name when no Field label names it (a Field label is preferred). */
  "aria-label"?: string
  /** Layout only. */
  className?: string
}

const hasFiles = (event: DragEvent) => [...event.dataTransfer.types].includes("Files")

/**
 * Drop files on the dashed tile, or activate it to browse. The file input itself is the
 * focusable control (so a Field label names it and Enter/Space open the picker); the
 * tile shows its focus. Rejected files are reported to `onFiles` with a reason for the
 * field's message line — the tile never grows to show errors.
 */
export function FileDrop({
  onFiles,
  accept,
  maxSize,
  maxFiles,
  existing = 0,
  multiple = true,
  disabled = false,
  invalid,
  hint,
  dragging: forceDragging = false,
  variant = "full",
  className,
  "aria-label": ariaLabel,
}: FileDropProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const depth = useRef(0)
  const [dragOver, setDragging] = useState(false)
  const dragging = dragOver || forceDragging

  const take = (list: FileList | null) => {
    const files = list ? [...list] : []
    if (files.length === 0) return
    const { accepted, rejected } = screenFiles(files, { accept, maxSize, maxFiles, existing })
    onFiles(accepted, rejected)
  }

  const limits =
    hint ??
    [maxSize !== undefined ? `Max ${formatBytes(maxSize)} per file` : null, accept ? describeAccept(accept) : null]
      .filter(Boolean)
      .join(" · ")

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the file input inside is the keyboard control
    <div
      className={cx("fa-file-drop", className)}
      data-variant={variant}
      data-dragging={dragging ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      onClick={(event) => {
        if (disabled || event.target === inputRef.current) return
        inputRef.current?.click()
      }}
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
        if (disabled) return
        event.preventDefault()
        depth.current = 0
        setDragging(false)
        take(event.dataTransfer.files)
      }}
    >
      <BaseField.Control
        ref={inputRef}
        render={<input type="file" />}
        className="fa-file-drop-input sr-only"
        aria-label={ariaLabel}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          const input = event.currentTarget as HTMLInputElement
          take(input.files)
          input.value = ""
        }}
      />
      <span className="fa-tile-icon fa-file-drop-icon" aria-hidden>
        <IconUpload />
      </span>
      <span className="fa-file-drop-text">
        <span className="fa-file-drop-title">
          {dragging ? "Drop to add" : multiple ? "Drop files here or " : "Drop a file here or "}
          {dragging ? null : <span className="fa-file-drop-link">browse</span>}
        </span>
        {limits ? <span className="fa-file-drop-hint">{limits}</span> : null}
      </span>
    </div>
  )
}

export type FileStatus = "queued" | "uploading" | "done" | "error"

export interface FileRowProps extends Omit<ComponentProps<"li">, "children"> {
  name: string
  /** Bytes. */
  size: number
  /** Current operation or connection status. */
  status?: FileStatus
  /** 0–100 while uploading; null for unknown. */
  progress?: number | null
  /** What went wrong, in place of the size line ("Upload failed — retry when online"). */
  error?: string
  /** Called when remove occurs. The callback type specifies its arguments. */
  onRemove?: () => void
}

/** One file in a FileList: name, size and state, a progress bar of fixed height, remove. */
export function FileRow({ name, size, status = "done", progress, error, onRemove, className, ...rest }: FileRowProps) {
  const value = status === "done" ? 100 : status === "queued" ? 0 : (progress ?? null)
  const state =
    status === "uploading"
      ? progress === null || progress === undefined
        ? "Uploading"
        : `${Math.round(progress)}%`
      : status === "queued"
        ? "Waiting"
        : status === "done"
          ? "Uploaded"
          : null
  return (
    <li {...rest} className={cx("fa-file-row", className)} data-status={status}>
      <span className="fa-file-row-icon" aria-hidden>
        <IconFile />
      </span>
      <div className="fa-file-row-main">
        <div className="fa-file-row-head">
          <span className="fa-file-row-name" title={name}>
            {name}
          </span>
          {status === "error" ? (
            <span className="fa-file-row-error" title={error}>
              {error ?? "Upload failed"}
            </span>
          ) : (
            <span className="fa-file-row-meta" data-numeric>
              {formatBytes(size)}
              {state ? ` · ${state}` : null}
            </span>
          )}
        </div>
        <Progress
          value={value}
          size="sm"
          showValue={false}
          tone={status === "error" ? "danger" : status === "done" ? "success" : "accent"}
          aria-label={`${name} upload`}
          className="fa-file-row-progress"
        />
      </div>
      {onRemove ? (
        <Button variant="ghost" size="sm" icon={<IconClose />} aria-label={`Remove ${name}`} onClick={onRemove} />
      ) : null}
    </li>
  )
}

/** The list under a FileDrop. Rows have a fixed height, so progress never moves them. */
export function FileList({ className, ...rest }: ComponentProps<"ul">) {
  return <ul {...rest} className={cx("fa-file-list", className)} />
}
