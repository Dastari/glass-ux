import { useRender } from "@base-ui/react/use-render"
import { mergeProps } from "@base-ui/react/merge-props"
import { useEffect, useRef, type ComponentProps, type ReactElement } from "react"
import { IconSidebar } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { Button, type ButtonProps } from "../button/index.js"
import { useAriaShortcut } from "../kbd/index.js"
import { useSidebarInternal } from "./context.js"
import { sidebarMessages } from "./messages.js"

export interface SidebarTriggerProps extends Omit<ButtonProps, "children"> {
  /** Toggle the enclosing provider with this `name` instead of the nearest one. */
  sidebar?: string
}

/**
 * An icon button that toggles the sidebar: it collapses or expands it on desktops and opens or
 * closes the sheet on phones. `aria-expanded` and `aria-controls` report the state; the
 * tooltip shows the shortcut. Collapsing a sidebar that holds focus returns focus here.
 */
export function SidebarTrigger({ sidebar, className, onClick, icon, "aria-label": ariaLabel, ...rest }: SidebarTriggerProps) {
  const messages = useMessages(sidebarMessages)
  const ctx = useSidebarInternal(sidebar)
  const ref = useRef<HTMLButtonElement>(null)
  const keys = useAriaShortcut(ctx.shortcut ?? undefined)
  const { registerReturn } = ctx
  useEffect(() => {
    const element = ref.current
    return element ? registerReturn(element) : undefined
  }, [registerReturn])
  if (ctx.collapsible === "none") return null
  const expanded = ctx.isMobile ? ctx.openMobile : ctx.open
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="sm"
      icon={icon ?? <IconSidebar />}
      aria-label={ariaLabel ?? messages.toggleSidebar}
      aria-expanded={expanded}
      aria-controls={ctx.isMobile ? undefined : ctx.paneId}
      aria-keyshortcuts={keys}
      shortcut={ctx.shortcut ?? undefined}
      {...rest}
      className={cx("fa-sidebar-trigger", className)}
      data-side={ctx.side}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) ctx.toggleWith("trigger", event.nativeEvent)
      }}
    />
  )
}

export interface SidebarInsetProps extends ComponentProps<"main"> {
  /** Render another element instead of `<main>`: `render={<div />}` for the inner provider of a second sidebar, which sits inside the outer `<main>`. */
  render?: ReactElement
}

/**
 * The content beside the sidebar: a `<main>` that takes the remaining width and reflows once
 * when the sidebar settles, never during its motion. With `variant="inset"` it is drawn as a
 * raised glass panel inset from the edges.
 */
export function SidebarInset({ render, className, ...rest }: SidebarInsetProps) {
  const ctx = useSidebarInternal()
  const variant = ctx.hint.variant ?? ctx.variant
  const raised = variant === "inset"
  return useRender({
    defaultTagName: "main",
    render,
    props: mergeProps<"main">(
      { className: cx("fa-sidebar-inset", raised && "glass-panel", className) },
      { ...rest, "data-raised": raised ? "" : undefined } as ComponentProps<"main">
    ),
  })
}
