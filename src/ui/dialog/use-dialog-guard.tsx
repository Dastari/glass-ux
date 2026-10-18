import { useCallback, useState, type ReactNode } from "react"
import { AlertDialog } from "../alert-dialog/alert-dialog.js"
import type { DialogChangeDetails } from "./dialog.js"

export interface DialogGuardOptions {
  open: boolean
  /** Your setter for `open`. Called with true on open, and with false on a dismissal while clean or after the person confirms the discard; a dirty dismissal asks first instead. */
  onOpenChange: (open: boolean) => void
  /** True while the dialog holds unsaved changes. */
  dirty: boolean
  /** Revert the form; runs when the user chooses to discard. */
  onDiscard?: () => void
  /** Names what is lost: "Discard changes to LMN-7C71?" */
  title?: ReactNode
  description?: ReactNode
  /** Visible label naming the outcome of the confirmation. */
  confirmLabel?: string
}

/**
 * Ask before a dirty dialog closes (R13.7, R15.4). Spread `rootProps` on Dialog.Root and
 * render `confirm` inside it, so the question opens as a nested dialog and the parent
 * recedes behind it. Esc, the backdrop, the close button and a swipe are all guarded.
 *
 *   const guard = useDialogGuard({ open, onOpenChange: setOpen, dirty, onDiscard: reset })
 *   <Dialog.Root {...guard.rootProps}>
 *     <Dialog.Popup>…{guard.confirm}</Dialog.Popup>
 *   </Dialog.Root>
 */
export function useDialogGuard({
  open,
  onOpenChange,
  dirty,
  onDiscard,
  title = "Discard unsaved changes?",
  description = "Your edits in this dialog are lost.",
  confirmLabel = "Discard changes",
}: DialogGuardOptions) {
  const [asking, setAsking] = useState(false)

  const handleOpenChange = useCallback(
    (next: boolean, details?: DialogChangeDetails) => {
      if (!next && dirty) {
        details?.cancel()
        setAsking(true)
        return
      }
      onOpenChange(next)
    },
    [dirty, onOpenChange]
  )

  const confirm = (
    <AlertDialog
      open={asking}
      onOpenChange={setAsking}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel="Keep editing"
      tone="warning"
      onConfirm={() => {
        onDiscard?.()
        onOpenChange(false)
      }}
    />
  )

  return { rootProps: { open, onOpenChange: handleOpenChange }, confirm, asking }
}
