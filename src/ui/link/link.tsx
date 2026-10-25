import { cloneElement, type ComponentProps, type ReactElement, type ReactNode } from "react"
import { IconExternalLink } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/use-messages.js"
import { linkMessages } from "./messages.js"

/**
 * How a link looks:
 *   inline      (default) accent text, underlined: links inside sentences
 *   standalone  accent text, underlined on hover: a link on its own line ("View all devices")
 *   subtle      the surrounding text colour, underlined on hover: names in tables and lists
 */
export type LinkVariant = "inline" | "standalone" | "subtle"

export interface LinkProps extends Omit<ComponentProps<"a">, "children"> {
  children: ReactNode
  variant?: LinkVariant
  /** Open in a new tab: adds `target="_blank"`, `rel="noopener noreferrer"`, an external mark and "(opens in a new tab)" for screen readers. */
  newTab?: boolean
  /** Show the external mark without opening a new tab. Default: on with `newTab`. */
  external?: boolean
  /** A leading icon, sized to the text. */
  icon?: ReactNode
  /** A link that cannot be followed now: no href, `aria-disabled`, muted. */
  disabled?: boolean
  /** A router's link element (`<RouterLink to="…" />`); its routing props, ref and handlers are kept. */
  render?: ReactElement<Record<string, unknown>>
  /** Wording overrides (the new-tab note). */
  labels?: Partial<typeof linkMessages.defaults>
}

/**
 * A text link: in a sentence, on its own line, or a quiet name in a table. Links go
 * somewhere; actions that change something are Buttons (ButtonLink when a button must
 * navigate).
 */
export function Link({
  variant = "inline",
  newTab = false,
  external = newTab,
  icon,
  disabled = false,
  render,
  labels,
  className,
  children,
  href,
  ...rest
}: LinkProps) {
  const t = useMessages(linkMessages, { labels })
  const props = {
    ...rest,
    href: disabled ? undefined : href,
    className: cx("fa-link", className),
    "data-variant": variant,
    "aria-disabled": disabled || undefined,
    target: newTab ? "_blank" : rest.target,
    rel: newTab ? "noopener noreferrer" : rest.rel,
  }
  const content = (
    <>
      {icon ? <span className="fa-link-icon">{icon}</span> : null}
      {children}
      {external ? <IconExternalLink className="fa-link-external" size="sm" aria-hidden /> : null}
      {newTab ? <span className="sr-only">{` ${t.newTab}`}</span> : null}
    </>
  )
  if (render && !disabled) return cloneElement(render, { ...props, ...render.props, className: cx(props.className, render.props.className as string | undefined) }, content)
  return <a {...props}>{content}</a>
}
