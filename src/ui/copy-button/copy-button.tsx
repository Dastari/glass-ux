import { useMessages } from "../../lib/i18n/index.js"
import { copyButtonMessages, getCopyButtonMessages } from "./messages.js"
import { IconCopy } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button, useActionFeedback, type ButtonProps } from "../button/index.js"
import { toast } from "../toast/index.js"

export interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "status" | "statusAnnouncement" | "children" | "icon" | "aria-label" | "value"> {
  /** The text to copy, or a function that returns it when pressed. */
  value: string | (() => string)
  /** Names what is copied: "Copy IP address". Also its tooltip. Default "Copy". */
  label?: string
  /** Show the label beside the icon (default: icon only, with the label as its tooltip). */
  showLabel?: boolean
}

/** Write text to the clipboard; falls back to a hidden textarea where the API is unavailable. */
export async function copyText(text: string, messages = getCopyButtonMessages()): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement("textarea")
  area.value = text
  area.setAttribute("readonly", "")
  area.style.position = "fixed"
  area.style.opacity = "0"
  document.body.append(area)
  area.select()
  const done = document.execCommand("copy")
  area.remove()
  if (!done) throw new Error(messages.copyUnavailable)
}

function getCOPY_ANNOUNCEMENT(messages: typeof copyButtonMessages.defaults) { return { success: messages.copied, error: messages.copyFailed } }


/**
 * Copies a value and confirms in place: the icon becomes a drawn ✓ for the feedback hold,
 * or ✕ when the clipboard refuses (R9.2), and a polite announcement says "Copied". The
 * button keeps its size throughout. Inside an Input's box, give it `className="fa-input-btn"`.
 */
export function CopyButton({ value, label: labelProp, showLabel = false, variant = "ghost", size = "sm", className, disabled, ...rest }: CopyButtonProps) {
  const messages = useMessages(copyButtonMessages)
  const label = labelProp ?? messages.copy

  const { status, run } = useActionFeedback()
  const copy = async () => {
    const text = typeof value === "function" ? value() : value
    await run(
      () => copyText(text, messages),
      () => toast.danger(messages.notCopied, { description: messages.clipboardBlocked })
    )
  }
  return (
    <Button
      {...rest}
      variant={variant}
      size={size}
      className={cx("fa-copy-button", className)}
      icon={<IconCopy />}
      aria-label={label}
      tooltip={status === "success" ? messages.copied : status === "error" ? messages.copyFailed : undefined}
      status={status}
      statusAnnouncement={getCOPY_ANNOUNCEMENT(messages)}
      disabled={disabled || (typeof value === "string" && !value)}
      onClick={() => void copy()}
    >
      {showLabel ? label : undefined}
    </Button>
  )
}
