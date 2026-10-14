/**
 * TabBar — phone navigation (R6.7, R21): the rail becomes a floating glass pill above the
 * bottom safe area with four or five destinations and "More". The active tab is an accent
 * icon on an accent-soft capsule. While content scrolls down the bar condenses (labels
 * fold away); scrolling up restores it. Reduced motion only shortens the change.
 */
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { createContext, useContext, useEffect, useState, type ComponentProps, type ReactElement, type ReactNode } from "react"
import { IconMoreHorizontal } from "../icons/generated/icons.js"
import { cx } from "../lib/cx.js"
import { useMediaQuery } from "../lib/use-media-query.js"
import { Sheet } from "../ui/sheet/index.js"
import { SHELL_QUERIES } from "./queries.js"

const CloseMore = createContext<(() => void) | null>(null)

/**
 * Condense on scroll down (past a small threshold), expand on scroll up. Listens only where
 * the tab bar is shown (phones): the capture listener reads scrollTop on every scroll event in
 * the document, which costs a style recalc per wheel notch on desktop tables.
 */
function useCondensedOnScroll() {
  const [condensed, setCondensed] = useState(false)
  const phone = useMediaQuery(SHELL_QUERIES.phone)
  useEffect(() => {
    if (!phone) return
    const last = new WeakMap<EventTarget, number>()
    const onScroll = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      const top = target.scrollTop
      const previous = last.get(target) ?? top
      last.set(target, top)
      const delta = top - previous
      if (top < 24) setCondensed(false)
      else if (delta > 6) setCondensed(true)
      else if (delta < -6) setCondensed(false)
    }
    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    return () => document.removeEventListener("scroll", onScroll, { capture: true })
  }, [phone])
  return phone && condensed
}

function Root({
  className,
  children,
  condensed: forced,
  ...rest
}: ComponentProps<"nav"> & {
  /** Accessible name when a visible label does not name the control. */
  "aria-label": string
  /** Force the condensed state (documentation); by default it follows scrolling. */
  condensed?: boolean
}) {
  const scrolled = useCondensedOnScroll()
  const condensed = forced ?? scrolled
  return (
    <nav {...rest} className={cx("glass-chrome fa-tabbar", className)} data-condensed={condensed ? "" : undefined}>
      <ul className="fa-tabbar-list">{children}</ul>
    </nav>
  )
}

export interface TabBarItemProps extends Omit<ComponentProps<"a">, "children"> {
  icon: ReactNode
  label: string
  /** Marks the current destination or active choice. */
  active?: boolean
  render?: ReactElement
}

function Item({ icon, label, active = false, render, className, ...rest }: TabBarItemProps) {
  const element = useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"a">(
      {
        className: cx("fa-tabbar-item fa-pressable", className),
        "aria-current": active ? "page" : undefined,
        children: (
          <>
            <span className="fa-tabbar-icon">{icon}</span>
            <span className="fa-tabbar-label">{label}</span>
          </>
        ),
      },
      { ...rest, "data-active": active ? "" : undefined } as ComponentProps<"a">
    ),
  })
  return <li className="fa-tabbar-entry">{element}</li>
}

/** The last tab: opens the remaining destinations (MoreItem rows) in a bottom Sheet. */
function More({ label = "More", title = "More", active = false, children }: { label?: string; title?: string; active?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="fa-tabbar-entry">
      <button
        type="button"
        className="fa-tabbar-item fa-pressable"
        data-active={active ? "" : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="fa-tabbar-icon">
          <IconMoreHorizontal />
        </span>
        <span className="fa-tabbar-label">{label}</span>
      </button>
      <Sheet.Root side="bottom" open={open} onOpenChange={(next) => setOpen(next)}>
        <Sheet.Popup size="sm">
          <Sheet.Header title={title} />
          <Sheet.Body>
            <CloseMore.Provider value={() => setOpen(false)}>
              <ul className="fa-tabbar-more-list">{children}</ul>
            </CloseMore.Provider>
          </Sheet.Body>
        </Sheet.Popup>
      </Sheet.Root>
    </li>
  )
}

function MoreItem({ icon, label, active = false, render, className, onClick, ...rest }: TabBarItemProps) {
  const close = useContext(CloseMore)
  const element = useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"a">(
      {
        className: cx("fa-item fa-tabbar-more-item", className),
        "aria-current": active ? "page" : undefined,
        onClick: (event) => {
          onClick?.(event)
          close?.()
        },
        children: (
          <>
            {icon}
            <span className="fa-item-label">{label}</span>
          </>
        ),
      },
      { ...rest, "data-active": active ? "" : undefined } as ComponentProps<"a">
    ),
  })
  return <li>{element}</li>
}

/**
 * A row of the More sheet that is not a destination (the product's module switch). Choosing
 * inside it closes the sheet, like choosing a destination.
 */
function MoreSection({ className, children }: { className?: string; children: ReactNode }) {
  const close = useContext(CloseMore)
  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- closes after the control inside handled the choice; the control has its own keys
    <li className={cx("fa-tabbar-more-section", className)} onClick={() => close?.()}>
      {children}
    </li>
  )
}

/** Compose primary application navigation for a narrow viewport, with labelled items and active-state feedback. */
export const TabBar = { Root, Item, More, MoreItem, MoreSection }
