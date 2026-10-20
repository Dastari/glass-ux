import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip"
import { useId, useState, useSyncExternalStore, type ComponentProps, type ReactElement, type ReactNode } from "react"
import { usePopupMetrics } from "../../lib/popup-metrics.js"
import { Kbd } from "../kbd/index.js"

/** Hover delay before the first tooltip opens. Later ones in the same group open at once. */
export const TOOLTIP_DELAY_MS = 500
/** A neighbour opens instantly if the previous tooltip closed less than this long ago. */
const GROUP_TIMEOUT_MS = 400
/**
 * The arrow's height in rem, matching `--_ah` on .fa-tooltip-arrow. The arrow protrudes this
 * far beyond the bubble, so it is added to --popup-offset: the arrow tip keeps the same gap
 * from the trigger as an arrowless bubble's edge.
 */
const ARROW_HEIGHT_REM = 0.375

type Mode = "light" | "dark"

function subscribeMode(notify: () => void) {
  const observer = new MutationObserver(notify)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] })
  return () => observer.disconnect()
}
const readMode = (): Mode => (document.documentElement.dataset.mode === "dark" ? "dark" : "light")

/**
 * The opposite of the document's mode. Tooltips are an inverted island (R3.5): dark on a
 * light page, light on a dark page.
 */
export function useInvertedMode(): Mode {
  const mode = useSyncExternalStore(subscribeMode, readMode, () => "light" as const)
  return mode === "dark" ? "light" : "dark"
}

/**
 * Groups tooltips: the first opens after 500ms, its neighbours open instantly while the
 * pointer moves along a toolbar. Mount once at the app root.
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <BaseTooltip.Provider delay={TOOLTIP_DELAY_MS} closeDelay={0} timeout={GROUP_TIMEOUT_MS}>
      {children}
    </BaseTooltip.Provider>
  )
}

type TriggerProps = Omit<ComponentProps<typeof BaseTooltip.Trigger>, "render" | "children" | "delay" | "closeDelay" | "disabled" | "content">

export interface TooltipProps extends TriggerProps {
  /** One line: the control's name, or why it is disabled. Never interactive content (R13.5). */
  content: ReactNode
  /** A keyboard shortcut drawn after the text in keycaps ("mod+k"). */
  shortcut?: string | undefined
  /**
   * The element the tooltip describes. No wrapper is added: the trigger's props and ref are
   * merged onto it, so it must forward its ref and spread props (every design-system control does).
   * A disabled control must stay hoverable — render it with aria-disabled
   * (Base UI `focusableWhenDisabled`) rather than the native disabled attribute.
   */
  children: ReactElement
  /**
   * Preferred side of the anchor; collision handling may choose another side. The logical
   * `inline-start` and `inline-end` follow the writing direction (a menu row's reason uses
   * `inline-end`, beside the menu).
   */
  side?: "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end"
  /** Alignment of the overlay relative to its anchor. */
  align?: "start" | "center" | "end"
  /** Set false to suppress the tooltip (for example while text is not truncated). */
  enabled?: boolean
  open?: boolean
  /** Called with the next open state when the tooltip shows (hover or focus, after the delay) or hides. Pair with `open` to control it. */
  onOpenChange?: (open: boolean) => void
  /** A pointer towards the trigger. On by default: tooltips label small, similar targets. */
  arrow?: boolean
  /**
   * Link the open tooltip to the trigger with aria-describedby. Default: only when the
   * content is text that differs from the trigger's aria-label (a reason, extra detail) —
   * a tooltip that repeats the name would be announced twice.
   */
  describe?: boolean
}

/**
 * A short label for a control, shown on hover and keyboard focus after 500ms. It composes
 * with other triggers in either direction:
 *
 *   <Tooltip content="More actions"><Menu.Trigger render={<Button … />} /></Tooltip>
 *   <Menu.Trigger render={<Tooltip content="More actions"><Button … /></Tooltip>} />
 *
 * The trigger keeps its own accessible name; the tooltip repeats it visually.
 */
export function Tooltip({
  content,
  shortcut,
  children,
  side = "top",
  align = "center",
  enabled = true,
  open,
  onOpenChange,
  arrow = true,
  describe,
  ...triggerProps
}: TooltipProps) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const isOpen = open ?? shown
  const name = (children.props as { "aria-label"?: unknown })["aria-label"]
  const describes = describe ?? (typeof content === "string" && content !== name)
  return (
    <BaseTooltip.Root
      disabled={!enabled}
      disableHoverablePopup
      open={open}
      onOpenChange={(next, details) => {
        // Escape closes the tooltip and carries on to the layer around it (a dialog, popover
        // or menu), so a tooltip shown on focus never costs an extra press.
        if (!next && details.reason === "escape-key") details.allowPropagation()
        setShown(next)
        onOpenChange?.(next)
      }}
    >
      <BaseTooltip.Trigger
        {...triggerProps}
        aria-describedby={describes && isOpen && enabled ? id : undefined}
        render={children}
        delay={TOOLTIP_DELAY_MS}
      />
      <TooltipPopup side={side} align={align} arrow={arrow} id={id}>
        <TooltipContent content={content} shortcut={shortcut} />
      </TooltipPopup>
    </BaseTooltip.Root>
  )
}

function TooltipContent({ content, shortcut }: { content: ReactNode; shortcut?: string | undefined }) {
  if (!shortcut) return content
  return (
    <span className="fa-tooltip-row">
      <span>{content}</span>
      <Kbd keys={shortcut} size="sm" className="fa-tooltip-kbd" />
    </span>
  )
}

interface TooltipPopupProps {
  id?: string
  /** Preferred side of the anchor; collision handling may choose another side. */
  side: NonNullable<TooltipProps["side"]>
  /** Alignment of the overlay relative to its anchor. */
  align: NonNullable<TooltipProps["align"]>
  /** Whether floating content displays a positioning arrow. */
  arrow: boolean
  children: ReactNode
  /** Anchor used to position floating content. */
  anchor?: ComponentProps<typeof BaseTooltip.Positioner>["anchor"]
}

/** Portal + positioner + the inverted glass bubble. */
export function TooltipPopup({ id, side, align, arrow, children, anchor }: TooltipPopupProps) {
  const mode = useInvertedMode()
  const popup = usePopupMetrics()
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        className="fa-tooltip-positioner"
        side={side}
        align={align}
        sideOffset={arrow ? popup.offset + ARROW_HEIGHT_REM * popup.rem : popup.offset}
        collisionPadding={popup.collisionPadding}
        anchor={anchor}
      >
        <BaseTooltip.Popup id={id} role="tooltip" className="glass-overlay fa-tooltip" data-mode={mode}>
          {arrow ? <BaseTooltip.Arrow className="fa-tooltip-arrow" /> : null}
          {children}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  )
}

/** A static tooltip bubble for documentation and screenshots. Same classes, no behaviour. */
export function TooltipPreview({ content, shortcut, side = "top" }: {
  /** The bubble's text: a control's name or why it is disabled. */
  content: ReactNode
  /** A keyboard shortcut drawn after the text in keycaps ("mod+k"). */
  shortcut?: string
  /** Which side of the (imagined) trigger the bubble sits on; the arrow points back at it. Defaults to `"top"`. */
  side?: "top" | "bottom"
}) {
  const mode = useInvertedMode()
  return (
    <div className="fa-tooltip-preview" data-side={side}>
      <div className="glass-overlay fa-tooltip" data-mode={mode} data-side={side}>
        <span className="fa-tooltip-arrow" data-side={side === "top" ? "top" : "bottom"} aria-hidden />
        <TooltipContent content={content} shortcut={shortcut} />
      </div>
    </div>
  )
}

export { BaseTooltip as TooltipPrimitive }
