import type { ComponentProps } from "react"
import { cx } from "../../lib/cx.js"
import { BrandMark } from "../../ui/brand/index.js"

export type AiMarkSize = "xs" | "sm" | "md" | "lg"

export interface AiMarkProps extends Omit<ComponentProps<"span">, "children"> {
  /** xs 16 inline · sm 24 messages · md 32 headers · lg 64 the landing hero. */
  size?: AiMarkSize
  /** Draw the working ring (a spinner, so it is the one loop allowed, R18.2). */
  working?: boolean
  /** Accessible name. Omit when a nearby label already names the assistant. */
  label?: string
}

/**
 * The Assistant brand mark. It leads assistant messages, the drawer header, the docked pane
 * and the landing hero. A brand mark, not an icon (R19.3): the product's configured `ai`
 * mark (src/ui/brand), drawn inline in the brand tones, so it follows the palette and stays
 * legible in dark mode.
 */
export function AiMark({ size = "sm", working = false, label, className, ...rest }: AiMarkProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
      className={cx("fa-ai-mark", className)}
      data-size={size}
      data-working={working ? "" : undefined}
    >
      <BrandMark mark="ai" className="fa-ai-mark-img" />
    </span>
  )
}
