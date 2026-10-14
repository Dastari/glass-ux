import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog"
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react"
import { IconError, IconInfo, IconWarning } from "../../icons/generated/icons.js"
import { Button, useActionFeedback, type ButtonStatus, type ButtonVariant } from "../button/index.js"
import {
  Dialog,
  DialogClosePart,
  DialogDescriptionPart,
  DialogSurface,
  DialogTitlePart,
} from "../dialog/dialog.js"
import { toast } from "../toast/toast.js"
import { useSingleton } from "../../lib/use-singleton.js"

const TILE_TONE = { danger: "danger", warning: "warning", default: "info" } as const
const CONFIRM_VARIANT: Record<"danger" | "warning" | "default", ButtonVariant> = {
  danger: "danger",
  warning: "warning",
  default: "primary",
}

/** Mirrors --duration-slower: the ✓ draws before the dialog leaves. */
const SUCCESS_BEAT_MS = 450

/**
 * danger   destructive or irreversible (remove, wipe): solid danger confirm — the only one
 *          in the product (R12.4)
 * warning  loses work or interrupts someone but can be redone (discard edits, restart)
 * default  a consequential but safe step
 */
export type AlertTone = "danger" | "warning" | "default"

export interface AlertDialogProps {
  /** The element that opens it. Omit when controlling `open`. */
  trigger?: ReactElement
  open?: boolean
  defaultOpen?: boolean
  /** Called when open change occurs. The callback type specifies its arguments. */
  onOpenChange?: (open: boolean) => void
  /** Called when open change complete occurs. The callback type specifies its arguments. */
  onOpenChangeComplete?: (open: boolean) => void
  /** Names the target: "Remove NST-C106 from Northstar Studio?" (R12.4). */
  title: ReactNode
  /** One factual sentence: what happens, and whether it can be undone. */
  description?: ReactNode
  /** A verb naming the outcome: "Remove device". */
  confirmLabel: string
  /** Visible label for cancelling or dismissing the request. */
  cancelLabel?: string
  /** Label shown while the asynchronous action runs. Its width is reserved with the other feedback labels. */
  pendingLabel?: string
  tone?: AlertTone
  icon?: ReactNode
  /**
   * Runs in place: the confirm button shows pending, then ✓ and the dialog closes. If it
   * throws, the button shakes ✕, the dialog stays open and the reason goes to a toast.
   */
  onConfirm: () => unknown
  /** Title of the failure toast. Default: "<confirmLabel> failed". */
  failureTitle?: string
}

/**
 * A confirmation for destructive or irreversible actions. Cancel takes focus first; Esc
 * cancels; outside presses do nothing. While the action runs, it cannot be dismissed.
 */
export function AlertDialog({
  trigger,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onOpenChangeComplete,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  pendingLabel,
  tone = "danger",
  icon,
  onConfirm,
  failureTitle,
}: AlertDialogProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = openProp ?? uncontrolled
  const { status, run, reset } = useActionFeedback()
  const pending = status === "pending"
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(closeTimer.current), [])
  // A reopened dialog starts from rest, not from the last outcome.
  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolled(next)
    onOpenChange?.(next)
  }

  const handleConfirm = async () => {
    if (pending) return
    const ok = await run(
      async () => {
        await onConfirm()
      },
      (error) =>
        toast({
          tone: "danger",
          title: failureTitle ?? `${confirmLabel} failed`,
          description: error instanceof Error ? error.message : String(error),
        })
    )
    if (ok) closeTimer.current = setTimeout(() => setOpen(false), SUCCESS_BEAT_MS)
  }

  return (
    <BaseAlertDialog.Root
      open={open}
      onOpenChange={(next, details) => {
        if (!next && pending) {
          details.cancel()
          return
        }
        setOpen(next)
      }}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      {trigger ? <BaseAlertDialog.Trigger render={trigger} /> : null}
      <DialogSurface mode="dialog" kind="alert" size="sm">
        <AlertLayout
          tone={tone}
          icon={icon}
          title={title}
          description={description}
          cancelLabel={cancelLabel}
          confirmLabel={confirmLabel}
          pendingLabel={pendingLabel}
          status={status}
          onConfirm={() => void handleConfirm()}
        />
      </DialogSurface>
    </BaseAlertDialog.Root>
  )
}

interface AlertLayoutProps {
  tone: AlertTone
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Visible label for cancelling or dismissing the request. */
  cancelLabel: string
  /** Visible label naming the outcome of the confirmation. */
  confirmLabel: string
  /** Label shown while the asynchronous action runs. Its width is reserved with the other feedback labels. */
  pendingLabel?: string | undefined
  /** Current operation or connection status. */
  status: ButtonStatus
  /** Called when confirm occurs. The callback type specifies its arguments. */
  onConfirm?: () => void
}

/** Tone tile, the title naming the target, one sentence, then Cancel and the confirm. */
function AlertLayout({
  tone,
  icon,
  title,
  description,
  cancelLabel,
  confirmLabel,
  pendingLabel,
  status,
  onConfirm,
}: AlertLayoutProps) {
  const pending = status === "pending"
  return (
    <>
      <div className="fa-alert">
        <span className="fa-alert-icon" data-tone={TILE_TONE[tone]} aria-hidden>
          {icon ??
            (tone === "danger" ? (
              <IconError />
            ) : tone === "warning" ? (
              <IconWarning />
            ) : (
              <IconInfo />
            ))}
        </span>
        <div className="fa-alert-text">
          <DialogTitlePart className="fa-alert-title">{title}</DialogTitlePart>
          {description ? (
            <DialogDescriptionPart className="fa-alert-description">
              {description}
            </DialogDescriptionPart>
          ) : null}
        </div>
      </div>
      <footer className="fa-dialog-footer">
        <DialogClosePart render={<Button variant="ghost" disabled={pending}>{cancelLabel}</Button>} />
        <Button
          variant={CONFIRM_VARIANT[tone]}
          status={status}
          pendingLabel={pendingLabel}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </footer>
    </>
  )
}

export interface AlertDialogPreviewProps {
  tone?: AlertTone
  title: ReactNode
  description?: ReactNode
  /** Visible label naming the outcome of the confirmation. */
  confirmLabel: string
  /** Visible label for cancelling or dismissing the request. */
  cancelLabel?: string
  /** Label shown while the asynchronous action runs. Its width is reserved with the other feedback labels. */
  pendingLabel?: string
  /** Current operation or connection status. */
  status?: ButtonStatus
}

/** The alert surface in the page flow, for documentation. Real parts, non-modal. */
export function AlertDialogPreview({
  tone = "danger",
  cancelLabel = "Cancel",
  status = "idle",
  ...rest
}: AlertDialogPreviewProps) {
  return (
    <Dialog.Preview size="sm" kind="alert">
      <AlertLayout {...rest} tone={tone} cancelLabel={cancelLabel} status={status} />
    </Dialog.Preview>
  )
}

/* ── Imperative confirm() ────────────────────────────────────────────────────── */

export interface ConfirmOptions extends Omit<
  AlertDialogProps,
  "trigger" | "open" | "defaultOpen" | "onOpenChange" | "onOpenChangeComplete" | "onConfirm"
> {
  /** Optional work to run in place before resolving (pending → ✓ → close). */
  onConfirm?: () => unknown
}

interface Request extends ConfirmOptions {
  id: number
  resolve: (confirmed: boolean) => void
}

let queue: Request[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => {
  for (const listener of listeners) listener()
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Ask before a destructive action, from anywhere. Resolves `true` once confirmed (and once
 * `onConfirm` has succeeded), `false` if cancelled. Needs a mounted <ConfirmHost />
 * (ActionProvider mounts one).
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    queue = [...queue, { ...options, id: nextId++, resolve }]
    emit()
  })
}

/** Renders confirm() requests one at a time. Mount once; extra instances stay inert. */
export function ConfirmHost() {
  const owns = useSingleton("confirm-host")
  const current = useSyncExternalStore(
    subscribe,
    () => queue[0] ?? null,
    () => null
  )
  // A request is open until it is closed; the next one in the queue opens on its own.
  const [closedId, setClosedId] = useState<number | null>(null)
  const settled = useRef<number | null>(null)

  if (!owns || !current) return null
  const { id, resolve, onConfirm, ...props } = current
  return (
    <AlertDialog
      key={id}
      {...props}
      open={id !== closedId}
      onConfirm={async () => {
        await onConfirm?.()
        settled.current = id
        resolve(true)
      }}
      onOpenChange={(next) => {
        if (next) return
        if (settled.current !== id) {
          settled.current = id
          resolve(false)
        }
        setClosedId(id)
      }}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen) return
        queue = queue.slice(1)
        emit()
      }}
    />
  )
}
