import { lazy, Suspense, type ComponentProps, type ReactElement } from "react"
import { useMessages } from "../../lib/i18n/index.js"
import { useControllable } from "../../lib/use-controllable.js"
import { Popover, type PopoverPopupProps } from "../popover/index.js"
import type { EmojiPick, EmojiPickerProps } from "./emoji-picker.js"
import { EmojiGridSkeleton } from "./emoji-skeleton.js"
import { emojiPickerMessages } from "./messages.js"

const EmojiPicker = /* @__PURE__ */ lazy(() => import("./emoji-picker.js").then((module) => ({ default: module.EmojiPicker })))

export interface EmojiPopoverProps extends Omit<EmojiPickerProps, "autoFocus" | "aria-label">, Pick<PopoverPopupProps, "side" | "align" | "anchor"> {
  /** The element that opens it, usually a Button. Omit it and pass `anchor` when controlling `open`. */
  trigger?: ReactElement
  /** Whether it is open, controlled. */
  open?: boolean
  /** Whether it starts open when uncontrolled. */
  defaultOpen?: boolean
  /** Called with the next open state. */
  onOpenChange?: (open: boolean) => void
  /** Close after a pick. Default true. */
  closeOnPick?: boolean
  /** Names the popup. Default "Emoji picker". */
  "aria-label"?: string
  /** Where focus returns on close. Default the trigger. */
  finalFocus?: ComponentProps<typeof Popover.Popup>["finalFocus"]
}

/**
 * An EmojiPicker in a popover. The picker's code and data load when it first opens; until then
 * the popover holds the picker's size, so nothing moves.
 */
export function EmojiPopover({
  trigger,
  open,
  defaultOpen = false,
  onOpenChange,
  closeOnPick = true,
  side,
  align = "start",
  anchor,
  finalFocus,
  onPick,
  "aria-label": label,
  ...picker
}: EmojiPopoverProps) {
  const messages = useMessages(emojiPickerMessages)
  const [isOpen, setOpen] = useControllable(open, defaultOpen, onOpenChange)
  const pick = (choice: EmojiPick) => {
    onPick(choice)
    if (closeOnPick) setOpen(false)
  }
  return (
    <Popover.Root open={isOpen} onOpenChange={(next: boolean) => setOpen(next)}>
      {trigger ? <Popover.Trigger render={trigger} /> : null}
      <Popover.Popup size="lg" side={side} align={align} anchor={anchor} finalFocus={finalFocus} aria-label={label ?? messages.picker} className="fa-emoji-popup">
        <Suspense
          fallback={
            <div className="fa-emoji-picker">
              <EmojiGridSkeleton label={messages.loading} />
            </div>
          }
        >
          <EmojiPicker {...picker} autoFocus onPick={pick} />
        </Suspense>
      </Popover.Popup>
    </Popover.Root>
  )
}
