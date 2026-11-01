import type { ComponentProps, ReactElement } from "react"
import { useMessages } from "../../lib/i18n/index.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Popover, type PopoverPopupProps } from "../popover/index.js"
import { notificationListMessages } from "./messages.js"
import { NotificationList, type NotificationListProps } from "./notification-list.js"

export interface NotificationPopoverProps extends Omit<NotificationListProps, "defaultItems" | "onItemsChange" | "items">, Pick<PopoverPopupProps, "side" | "align" | "anchor"> {
  /** The rows. The host keeps them: the list leaves the page while the popover is closed. */
  items: NotificationListProps["items"]
  /** The element that opens it. Omit it and pass `anchor` when something else opens it, such as a menu item or a rail item. */
  trigger?: ReactElement
  /** Whether it is open, controlled. */
  open?: boolean
  /** Whether it starts open when uncontrolled. */
  defaultOpen?: boolean
  /** Called with the next open state. */
  onOpenChange?: (open: boolean) => void
  /** Where focus returns on close. Default the trigger; pass the opener when there is none. */
  finalFocus?: ComponentProps<typeof Popover.Popup>["finalFocus"]
}

/**
 * A NotificationList in a fixed-size popover for the shell. It holds the list's box through
 * loading, empty and full, and every row shows each time it opens. Give AccountButton or
 * Rail.Item the host's unread count: this component changes neither.
 */
export function NotificationPopover({
  trigger,
  open,
  defaultOpen = false,
  onOpenChange,
  side,
  align = "end",
  anchor,
  finalFocus,
  "aria-label": label,
  ...list
}: NotificationPopoverProps) {
  const messages = useMessages(notificationListMessages)
  const [isOpen, setOpen] = useControllable(open, defaultOpen, onOpenChange)
  const name = label ?? messages.notifications
  return (
    <Popover.Root open={isOpen} onOpenChange={(next: boolean) => setOpen(next)}>
      {trigger ? <Popover.Trigger render={trigger} /> : null}
      <Popover.Popup size="lg" side={side} align={align} anchor={anchor} finalFocus={finalFocus} aria-label={name} className="fa-notification-popup">
        <NotificationList {...list} aria-label={name} />
      </Popover.Popup>
    </Popover.Root>
  )
}
