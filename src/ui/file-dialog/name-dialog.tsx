import { useRef, useState, type FormEvent } from "react"
import { useMessages } from "../../lib/i18n/index.js"
import { Button } from "../button/index.js"
import { Dialog } from "../dialog/index.js"
import { Field } from "../field/index.js"
import { Input } from "../input/index.js"
import { fileDialogMessages } from "./messages.js"
import { splitName } from "./failure.js"

export interface NameDialogProps {
  open: boolean
  /** The dialog's title. */
  title: string
  /** The name to start from. */
  initial: string
  /** Verb on the confirm button. */
  confirmLabel: string
  /** Returns the refusal to show, or null when it worked. */
  onSubmit: (name: string) => Promise<string | null>
  onClose: () => void
  /** Runs once the dialog has gone, for focus. */
  onClosed?: () => void
}

/** One name in a small nested dialog: New folder and Rename. A refusal stays in the field. */
export function NameDialog({ open, title, initial, confirmLabel, onSubmit, onClose, onClosed }: NameDialogProps) {
  const messages = useMessages(fileDialogMessages)
  const input = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    setPending(true)
    const refusal = await onSubmit(name.trim())
    setPending(false)
    if (refusal) {
      setError(refusal)
      input.current?.focus()
    } else onClose()
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next, details) => {
        if (pending) details.cancel()
        else if (!next) onClose()
      }}
      onOpenChangeComplete={(next) => (next ? undefined : onClosed?.())}
    >
      <Dialog.Popup size="sm" initialFocus={input}>
        <Dialog.Header title={title} close={false} />
        <form onSubmit={(event) => void submit(event)}>
          <Dialog.Body>
            <Field label={messages.name} error={error ?? undefined}>
              <Input
                ref={input}
                value={name}
                autoComplete="off"
                onChange={(event) => {
                  setName(event.currentTarget.value)
                  setError(null)
                }}
                onFocus={(event) => event.currentTarget.setSelectionRange(0, splitName(event.currentTarget.value).stem.length)}
              />
            </Field>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close render={<Button variant="ghost" disabled={pending} />}>{messages.cancel}</Dialog.Close>
            <Button variant="primary" type="submit" status={pending ? "pending" : "idle"} statusAnnouncement={false}>
              {confirmLabel}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Popup>
    </Dialog.Root>
  )
}
