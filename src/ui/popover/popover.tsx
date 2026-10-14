import { Popover as BasePopover } from "@base-ui/react/popover"
import type { ComponentProps, ReactNode } from "react"
import { IconClose } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button } from "../button/index.js"

/** px offsets mirroring tokens: the trigger gap (--space-2) and the viewport margin. */
const POPUP_GAP = 8
const COLLISION_PADDING = 8

export type PopoverSize = "sm" | "md" | "lg"

export interface PopoverPopupProps extends Omit<ComponentProps<typeof BasePopover.Popup>, "className" | "title"> {
  className?: string
  /** Optional title row; adds a close button. Omit it when the trigger already names the content. */
  title?: ReactNode
  size?: PopoverSize
  /** Preferred side of the anchor; collision handling may choose another side. */
  side?: ComponentProps<typeof BasePopover.Positioner>["side"]
  /** Alignment of the overlay relative to its anchor. */
  align?: ComponentProps<typeof BasePopover.Positioner>["align"]
  /** Anchor used to position floating content. */
  anchor?: ComponentProps<typeof BasePopover.Positioner>["anchor"]
}

/**
 * Small, contextual, non-blocking content (R13.5): a filter, a detail peek, a short form.
 * Closes on Esc and outside press. No arrow — the popup sits 8px from its trigger and
 * grows out of it (transform-origin), which already says where it came from.
 */
function PopoverPopup({ title, size = "md", side = "bottom", align = "center", anchor, className, children, ...rest }: PopoverPopupProps) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        className="fa-popover-positioner"
        side={side}
        align={align}
        sideOffset={POPUP_GAP}
        collisionPadding={COLLISION_PADDING}
        anchor={anchor}
      >
        <BasePopover.Popup {...rest} className={cx("glass-overlay fa-popup fa-popover", className)} data-size={size}>
          {title ? (
            <div className="fa-popover-header">
              <BasePopover.Title className="fa-popover-title">{title}</BasePopover.Title>
              <BasePopover.Close render={<Button variant="ghost" size="sm" icon={<IconClose />} aria-label="Close" />} />
            </div>
          ) : null}
          <div className="fa-popover-body">{children}</div>
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  )
}

/** Static popover surface for documentation. Same classes, no behaviour. */
function PopoverPreview({ title, size = "md", children }: { title?: ReactNode; size?: PopoverSize; children: ReactNode }) {
  return (
    <div className="glass-overlay fa-popup fa-popover fa-popover-preview" data-size={size}>
      {title ? (
        <div className="fa-popover-header">
          <span className="fa-popover-title">{title}</span>
          <Button variant="ghost" size="sm" icon={<IconClose />} aria-label="Close" tabIndex={-1} />
        </div>
      ) : null}
      <div className="fa-popover-body">{children}</div>
    </div>
  )
}

export const Popover = {
  Root: BasePopover.Root,
  Trigger: BasePopover.Trigger,
  Popup: PopoverPopup,
  Close: BasePopover.Close,
  Description: BasePopover.Description,
  Preview: PopoverPreview,
}

export { BasePopover as PopoverPrimitive }
