import { Toast as BaseToast } from "@base-ui/react/toast"
import type { ReactNode } from "react"
import { IconClose, IconError, IconInfo, IconSuccess, IconWarning } from "../../icons/generated/icons.js"
import { Button } from "../button/index.js"
import { usePhoneLayout } from "../../lib/use-media-query.js"
import { useSingleton } from "../../lib/use-singleton.js"

export type ToastTone = "success" | "info" | "warning" | "danger"

export interface ToastOptions {
  /** Names the target and the outcome: "NST-C106 restarted". */
  title: string
  /** The reason or the detail, one sentence. */
  description?: ReactNode
  tone?: ToastTone
  /** At most one action (Undo, View). */
  action?: { label: string; onClick: () => void }
  /** ms before it dismisses itself; 0 keeps it until closed. Danger toasts stay longer. */
  timeout?: number
  /** Re-using an id updates that toast in place instead of stacking another. */
  id?: string
}

/** Default lifetimes in ms: long enough to read the title and description twice. */
const TIMEOUT_MS = 5000
const DANGER_TIMEOUT_MS = 8000

/**
 * The global toast manager. `toast()` works anywhere — event handlers, loaders, plain
 * functions outside React — and renders in the single <Toaster /> viewport.
 */
export const toastManager = BaseToast.createToastManager()

function add({ tone = "info", action, timeout, ...rest }: ToastOptions) {
  return toastManager.add({
    ...rest,
    type: tone,
    // Danger is announced assertively (role=alert); everything else politely.
    priority: tone === "danger" ? "high" : "low",
    timeout: timeout ?? (tone === "danger" ? DANGER_TIMEOUT_MS : TIMEOUT_MS),
    actionProps: action ? { children: action.label, onClick: action.onClick } : undefined,
  })
}

type ToneShortcut = (title: string, options?: Omit<ToastOptions, "title" | "tone">) => string

/** Show a toast. Returns its id. */
export const toast = Object.assign(add, {
  success: ((title, options) => add({ ...options, title, tone: "success" })) as ToneShortcut,
  info: ((title, options) => add({ ...options, title, tone: "info" })) as ToneShortcut,
  warning: ((title, options) => add({ ...options, title, tone: "warning" })) as ToneShortcut,
  danger: ((title, options) => add({ ...options, title, tone: "danger" })) as ToneShortcut,
  dismiss: (id?: string) => toastManager.close(id),
})

const TONE_ICON: Record<ToastTone, ReactNode> = {
  success: <IconSuccess />,
  info: <IconInfo />,
  warning: <IconWarning />,
  danger: <IconError />,
}

function toneOf(type: string | undefined): ToastTone {
  return type === "success" || type === "warning" || type === "danger" ? type : "info"
}

interface ToastLayoutProps {
  tone: ToastTone
  title: ReactNode
  description?: ReactNode
  /** Trailing action for a notice or result. */
  action?: ReactNode
  /** Closes the current overlay or view. */
  close: ReactNode
}

/** The inside of a toast. Shared by live toasts and the static preview. */
export function ToastLayout({ tone, title, description, action, close }: ToastLayoutProps) {
  return (
    <>
      <span className="fa-tile-icon fa-toast-icon" data-tone={tone} aria-hidden>
        {TONE_ICON[tone]}
      </span>
      <div className="fa-toast-text">
        {title}
        {description}
      </div>
      {action}
      {close}
    </>
  )
}

function ToastList() {
  const { toasts } = BaseToast.useToastManager()
  const phone = usePhoneLayout()
  return toasts.map((item) => {
    const tone = toneOf(item.type)
    return (
      <BaseToast.Root
        key={item.id}
        toast={item}
        className="glass-overlay glass-detached fa-toast"
        data-tone={tone}
        swipeDirection={phone ? "up" : ["right", "down"]}
      >
        <BaseToast.Content className="fa-toast-content">
          <ToastLayout
            tone={tone}
            title={<BaseToast.Title className="fa-toast-title" />}
            description={item.description ? <BaseToast.Description className="fa-toast-description" /> : null}
            action={<BaseToast.Action className="fa-toast-action" render={<Button size="sm" />} />}
            close={
              <BaseToast.Close
                className="fa-toast-close"
                render={<Button variant="ghost" size="sm" icon={<IconClose />} aria-label="Dismiss" />}
              />
            }
          />
        </BaseToast.Content>
      </BaseToast.Root>
    )
  })
}

/**
 * The toast viewport: bottom-right on desktop, top on phones (R13.6). At most three are
 * visible; the stack fans out while hovered or focused and timers pause. F6 moves focus
 * into it. Mount once at the app root — extra instances stay inert.
 */
export function Toaster() {
  const owns = useSingleton("toaster")
  const phone = usePhoneLayout()
  if (!owns) return null
  return (
    <BaseToast.Provider toastManager={toastManager} limit={3}>
      <BaseToast.Portal>
        <BaseToast.Viewport className="fa-toast-viewport" data-position={phone ? "top" : "bottom"}>
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  )
}

/** A static toast for documentation. Same classes and layout, no timers. */
export function ToastPreview({ tone = "info", title, description, action }: { tone?: ToastTone; title: string; description?: string; action?: string }) {
  return (
    <div className="glass-overlay glass-detached fa-toast fa-toast-preview" data-tone={tone} role="presentation">
      <div className="fa-toast-content">
        <ToastLayout
          tone={tone}
          title={<p className="fa-toast-title">{title}</p>}
          description={description ? <p className="fa-toast-description">{description}</p> : null}
          action={action ? <Button size="sm" className="fa-toast-action" tabIndex={-1}>{action}</Button> : null}
          close={<Button variant="ghost" size="sm" icon={<IconClose />} aria-label="Dismiss" tabIndex={-1} className="fa-toast-close" />}
        />
      </div>
    </div>
  )
}
