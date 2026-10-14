import { Separator as BaseSeparator } from "@base-ui/react/separator"
import type { ComponentProps } from "react"
import { cx } from "../../lib/cx.js"

export interface SeparatorProps extends Omit<ComponentProps<typeof BaseSeparator>, "className"> {
  className?: string
}

/**
 * A hairline. Dividers come last (R5.8): use space, then grouping, and only then this — and
 * only between action groups in a toolbar or menu, as table row lines, or as a scroll edge.
 */
export function Separator({ orientation = "horizontal", className, ...rest }: SeparatorProps) {
  return <BaseSeparator {...rest} orientation={orientation} className={cx("fa-separator", className)} />
}
