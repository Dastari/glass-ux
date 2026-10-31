import type { ReactNode, SVGProps } from "react"
import { cx } from "../../lib/cx.js"

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl"

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children" | "ref"> {
  /** Token size. Omit only when a parent component sizes its icons. */
  size?: IconSize
  /** Accessible name. Omit for decorative icons (the default) — they are hidden from AT. */
  label?: string
  /** Set false to drop the duotone tint for this instance. */
  tint?: boolean
}

export type IconComponent = ((props: IconProps) => ReactNode) & { iconName: string }

/**
 * Wrap SVG children in the shared Glass UX icon frame.
 *
 * `children` may be the SVG content or a function that returns it. The generated icon set
 * passes a function so the content is created on first render, which lets bundlers drop
 * every icon a module does not use.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createIcon(name: string, children: ReactNode | (() => ReactNode)): IconComponent {
  let content: ReactNode
  let resolved = false
  const resolve = (): ReactNode => {
    if (!resolved) {
      content = typeof children === "function" ? children() : children
      resolved = true
    }
    return content
  }
  function GlassUxIcon({ size, label, tint = true, className, ...rest }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        className={cx("fa-icon", className)}
        data-icon={name}
        data-icon-dir={/^(?:chevrons?-(?:left|right)|arrow-(?:left|right|up-right)|external-link|undo|redo|indent|outdent|send|log-in|log-out|page-first|page-last|sidebar|inspector)$/.test(name) ? "mirror" : undefined}
        data-size={size}
        data-tint={tint ? undefined : "off"}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        {...rest}
      >
        {resolve()}
      </svg>
    )
  }
  GlassUxIcon.displayName = `Icon(${name})`
  return Object.assign(GlassUxIcon, { iconName: name })
}
