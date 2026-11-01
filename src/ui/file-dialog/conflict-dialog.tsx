import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog"
import { useRef } from "react"
import type { FileStat } from "../../file-provider/index.js"
import { IconWarning } from "../../icons/generated/icons.js"
import { useMessages } from "../../lib/i18n/index.js"
import { dateTimeFormat } from "../../lib/locale/intl.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { Button } from "../button/index.js"
import { DialogDescriptionPart, DialogSurface, DialogTitlePart } from "../dialog/dialog.js"
import { formatBytes } from "../file-drop/files.js"
import { fileDialogMessages } from "./messages.js"

/** What the person chose in a conflict. */
export type FileConflictChoice = "replace" | "copy" | "cancel"

export interface FileConflictDialogProps {
  /** Whether the question is showing. */
  open: boolean
  /** The file's name. */
  name: string
  /** The file as it is now, or null if it has gone. */
  current: FileStat | null
  /** Called once with the choice. Escape is `cancel`. Close it by setting `open`. */
  onResolve: (choice: FileConflictChoice) => void
  /** Adds Compare. */
  onCompare?: (current: FileStat | null) => void
}

/**
 * The conflict step alone, for a plain Save that opens no dialog: someone else's write got there
 * first, and nothing has closed, so no edits are lost. It says who won and offers Replace, Save a
 * copy and Compare; `FileDialog` shows it when `onSave` returns a conflict.
 */
export function FileConflictDialog({ open, name, current, onResolve, onCompare }: FileConflictDialogProps) {
  const messages = useMessages(fileDialogMessages)
  const locale = useLocale()
  const cancel = useRef<HTMLButtonElement>(null)
  const detail = !current
    ? messages.conflictGone
    : current.modified !== undefined && current.size !== null
      ? messages.conflictChanged({ modified: dateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(current.modified), size: formatBytes(current.size, locale) })
      : current.size !== null
        ? messages.conflictChangedSize(formatBytes(current.size, locale))
        : messages.conflictChangedUnknown
  return (
    <BaseAlertDialog.Root open={open} onOpenChange={(next) => (next ? undefined : onResolve("cancel"))}>
      <DialogSurface mode="dialog" kind="alert" size="md" initialFocus={cancel}>
        <div className="fa-alert">
          <span className="fa-alert-icon" data-tone="warning" aria-hidden>
            <IconWarning />
          </span>
          <div className="fa-alert-text">
            <DialogTitlePart className="fa-alert-title">{messages.conflictTitle(name)}</DialogTitlePart>
            <DialogDescriptionPart className="fa-alert-description">{detail}</DialogDescriptionPart>
          </div>
        </div>
        <footer className="fa-dialog-footer">
          {onCompare ? (
            <div className="fa-dialog-footer-start">
              <Button variant="ghost" onClick={() => onCompare(current)}>
                {messages.compare}
              </Button>
            </div>
          ) : null}
          <Button ref={cancel} variant="ghost" onClick={() => onResolve("cancel")}>
            {messages.cancel}
          </Button>
          <Button variant="secondary" onClick={() => onResolve("copy")}>
            {messages.saveCopy}
          </Button>
          <Button variant="warning" onClick={() => onResolve("replace")}>
            {current ? messages.replace : messages.saveAnyway}
          </Button>
        </footer>
      </DialogSurface>
    </BaseAlertDialog.Root>
  )
}
