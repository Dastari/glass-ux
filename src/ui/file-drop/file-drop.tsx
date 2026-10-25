import { useMessages } from "../../lib/i18n/index.js"
import { fileDropMessages } from "./messages.js"
import { Field as BaseField } from "@base-ui/react/field"
import { useLayoutEffect, useRef, useState, type ComponentProps, type DragEvent, type ReactNode } from "react"
import { IconClose, IconFile, IconUpload } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { Button } from "../button/index.js"
import { Progress } from "../progress/index.js"
import { TruncatedText } from "../truncated-text/index.js"
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
  const messages = useMessages(fileDropMessages)

  const locale = useLocale()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const depth = useRef(0)
  const [dragOver, setDragging] = useState(false)
  const dragging = dragOver || forceDragging

  const take = (list: FileList | null) => {
    const files = list ? [...list] : []
    if (files.length === 0) return
    const { accepted, rejected } = screenFiles(files, { accept, maxSize, maxFiles, existing, locale }, messages)
    onFiles(accepted, rejected)
  }

  const limits =
    hint ??
    [maxSize !== undefined ? messages.maxPerFile(formatBytes(maxSize, locale)) : null, accept ? describeAccept(accept, locale, messages) : null]
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
          {dragging ? messages.dropToAdd : multiple ? messages.dropFilesHereOr : messages.dropAFileHereOr}
          {dragging ? null : <span className="fa-file-drop-link">{messages.browse}</span>}
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
  /** Called when the row's remove button is pressed. Without it the row has no remove button. */
  onRemove?: () => void
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect

/**
 * Where focus goes when a focused row leaves the list: the next row's remove button (or row),
 * then the previous one, then the drop zone's file input in the same container.
 */
function focusAfterRemoval(row: HTMLElement) {
  const control = (item: Element | null) =>
    item instanceof HTMLElement ? (item.querySelector<HTMLElement>("[data-file-remove]") ?? null) : null
  const list = row.parentElement
  const drop = list?.parentElement?.querySelector<HTMLElement>(".fa-file-drop-input:not(:disabled)")
  const target = control(row.nextElementSibling) ?? control(row.previousElementSibling) ?? drop
  target?.focus()
}

/** The outcome of an upload, kept in an always-mounted polite live region. */
function useUploadAnnouncement(name: string, status: FileStatus, error?: string) {
  const messages = useMessages(fileDropMessages)

  const [announcement, setAnnouncement] = useState("")
  const [previous, setPrevious] = useState(status)
  if (previous !== status) {
    setPrevious(status)
    setAnnouncement(
      status === "done" ? messages.uploaded(name) : status === "error" ? messages.failed(name, error ?? messages.uploadFailed) : ""
    )
  }
  return announcement
}

/** One file in a FileList: name, size and state, a progress bar of fixed height, remove. */
export function FileRow({ name, size, status = "done", progress, error, onRemove, className, ref, ...rest }: FileRowProps) {
  const messages = useMessages(fileDropMessages)

  const rowRef = useRef<HTMLLIElement | null>(null)
  const setRow = (node: HTMLLIElement | null) => {
    rowRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }
  const announcement = useUploadAnnouncement(name, status, error)
  const locale = useLocale()
  // Removing the focused row would drop focus to the document: hand it to a neighbour first.
  useIsomorphicLayoutEffect(() => {
    const row = rowRef.current
    return () => {
      if (row && row.contains(document.activeElement)) focusAfterRemoval(row)
    }
  }, [])
  const value = status === "done" ? 100 : status === "queued" ? 0 : (progress ?? null)
  const state =
    status === "uploading"
      ? progress === null || progress === undefined
        ? messages.uploading
        : `${Math.round(progress)}%`
      : status === "queued"
        ? messages.waiting
        : status === "done"
          ? messages.uploaded2
          : null
  return (
    <li {...rest} ref={setRow} className={cx("fa-file-row", className)} data-status={status}>
      <span className="fa-file-row-icon" aria-hidden>
        <IconFile />
      </span>
      <div className="fa-file-row-main">
        <div className="fa-file-row-head">
          <TruncatedText className="fa-file-row-name">{name}</TruncatedText>
          {status === "error" ? (
            <TruncatedText className="fa-file-row-error">{error ?? messages.uploadFailed}</TruncatedText>
          ) : (
            <span className="fa-file-row-meta" data-numeric>
              {formatBytes(size, locale)}
              {state ? ` · ${state}` : null}
            </span>
          )}
        </div>
        <Progress
          value={value}
          size="sm"
          showValue={false}
          tone={status === "error" ? "danger" : status === "done" ? "success" : "accent"}
          aria-label={messages.upload(name)}
          className="fa-file-row-progress"
        />
      </div>
      {onRemove ? (
        <Button
          variant="ghost"
          size="sm"
          icon={<IconClose />}
          aria-label={messages.remove(name)}
          data-file-remove=""
          onClick={onRemove}
        />
      ) : null}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </li>
  )
}

/** The list under a FileDrop. Rows have a fixed height, so progress never moves them. */
export function FileList({ className, ...rest }: ComponentProps<"ul">) {
  return <ul {...rest} className={cx("fa-file-list", className)} />
}
