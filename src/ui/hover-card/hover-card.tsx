import { PreviewCard as BasePreviewCard } from "@base-ui/react/preview-card"
import type { ComponentProps, ReactElement, ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { popupContainer } from "../../lib/popup-container.js"
import { usePopupMetrics } from "../../lib/popup-metrics.js"

export type HoverCardSize = "sm" | "md" | "lg"

/** How long the pointer rests before the card opens, in milliseconds (as EntityChip's preview). */
export const HOVER_CARD_DELAY_MS = 400
/** How long the card lingers after the pointer leaves, in milliseconds. */
export const HOVER_CARD_CLOSE_DELAY_MS = 150

export interface HoverCardPopupProps extends Omit<ComponentProps<typeof BasePreviewCard.Popup>, "className"> {
  className?: string
  /** sm 16rem, md 20rem (default), lg 26rem. */
  size?: HoverCardSize
  side?: ComponentProps<typeof BasePreviewCard.Positioner>["side"]
  align?: ComponentProps<typeof BasePreviewCard.Positioner>["align"]
}

function HoverCardPopup({ size = "md", side = "bottom", align = "center", className, children, ...rest }: HoverCardPopupProps) {
  const popup = usePopupMetrics()
  return (
    <BasePreviewCard.Portal container={popupContainer()}>
      <BasePreviewCard.Positioner className="fa-hover-card-positioner" side={side} align={align} sideOffset={popup.offset} collisionPadding={popup.collisionPadding}>
        <BasePreviewCard.Popup {...rest} className={cx("glass-overlay fa-popup fa-hover-card", className)} data-size={size}>
          <div className="fa-hover-card-body">{children}</div>
        </BasePreviewCard.Popup>
      </BasePreviewCard.Positioner>
    </BasePreviewCard.Portal>
  )
}

export interface HoverCardProps {
  /** The card's content: a summary of what the trigger points to. Never the only way to reach an action. */
  content: ReactNode
  /** The element that opens the card on hover and keyboard focus, normally a link. It must forward its ref and props. */
  children: ReactElement
  size?: HoverCardSize
  /** Preferred side of the trigger; collision handling may choose another. Default bottom. */
  side?: HoverCardPopupProps["side"]
  /** Alignment along that side. Default centre. */
  align?: HoverCardPopupProps["align"]
  /** Milliseconds before opening. Default 400. */
  delay?: number
  /** Milliseconds before closing once the pointer leaves. Default 150. */
  closeDelay?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * A summary card that opens while the pointer rests on a link or a name, and on keyboard
 * focus: a person's details, a ticket's status, a page preview. It is supplementary — the
 * trigger still goes where it says, and anything in the card is reachable another way, since
 * touch screens never show it. For a control's name use Tooltip; for content the person opens
 * on purpose, use Popover.
 */
function HoverCardRoot({ content, children, size, side, align, delay = HOVER_CARD_DELAY_MS, closeDelay = HOVER_CARD_CLOSE_DELAY_MS, open, onOpenChange }: HoverCardProps) {
  return (
    <BasePreviewCard.Root open={open} onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}>
      <BasePreviewCard.Trigger render={children} delay={delay} closeDelay={closeDelay} />
      <HoverCardPopup size={size} side={side} align={align}>
        {content}
      </HoverCardPopup>
    </BasePreviewCard.Root>
  )
}

/** A hover card: `content` and a trigger child, or the parts `Root`, `Trigger` and `Popup` from Base UI's preview card. */
export const HoverCard = Object.assign(HoverCardRoot, {
  Root: BasePreviewCard.Root,
  Trigger: BasePreviewCard.Trigger,
  Popup: HoverCardPopup,
})
