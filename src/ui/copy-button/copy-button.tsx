import { useState } from "react"
import { IconCopy } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button, useActionFeedback, type ButtonProps } from "../button/index.js"
import { toast } from "../toast/index.js"

export interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "status" | "children" | "icon" | "aria-label" | "value"> {
  /** The text to copy, or a function that returns it when pressed. */
  value: string | (() => string)
  /** Names what is copied: "Copy IP address". Also its tooltip. Default "Copy". */
  label?: string
  /** Show the label beside the icon (default: icon only, with the label as its tooltip). */
  showLabel?: boolean
}

/** Write text to the clipboard; falls back to a hidden textarea where the API is unavailable. */
export async function copyText(text: string): Promise<void> {
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
  if (!done) throw new Error("Copy is not available in this browser")
}

/**
 * Copies a value and confirms in place: the icon becomes a drawn ✓ for the feedback hold,
 * or ✕ when the clipboard refuses (R9.2), and a polite announcement says "Copied". The
 * button keeps its size throughout. Inside an Input's box, give it `className="fa-input-btn"`.
 */
export function CopyButton({ value, label = "Copy", showLabel = false, variant = "ghost", size = "sm", className, disabled, ...rest }: CopyButtonProps) {
  const { status, run } = useActionFeedback()
  const [announcement, setAnnouncement] = useState("")
  const copy = async () => {
    const text = typeof value === "function" ? value() : value
    const ok = await run(
      () => copyText(text),
      () => toast.danger("Not copied", { description: "The browser blocked the clipboard. Select the text and copy it instead." })
    )
    setAnnouncement(ok ? "Copied" : "Copy failed")
  }
  return (
    <>
      <Button
        {...rest}
        variant={variant}
        size={size}
        className={cx("fa-copy-button", className)}
        icon={<IconCopy />}
        aria-label={label}
        tooltip={status === "success" ? "Copied" : status === "error" ? "Copy failed" : undefined}
        status={status}
        disabled={disabled || (typeof value === "string" && !value)}
        onClick={() => void copy()}
      >
        {showLabel ? label : undefined}
      </Button>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </>
  )
}
