/**
 * Inspector — context beside the workspace: Assistant, the selected item's details.
 * Docked as a glass pane at 1280px and wider (open by default from 1920px, R5.4); a
 * slide-over sheet below that. Its open state persists (shell-state.ts).
 */
import { useRef, type ReactNode } from "react"
import { IconClose } from "../icons/generated/icons.js"
import { cx } from "../lib/cx.js"
import { useScrollEdges } from "../lib/use-scroll-edges.js"
import { Button } from "../ui/button/index.js"
import { Sheet } from "../ui/sheet/index.js"
import { useShell } from "./app-shell.js"

export interface InspectorProps {
  title: string
  /** Under the title, as data: what the pane is showing ("North studio printing and offline PCs"). */
  subtitle?: ReactNode
  icon?: ReactNode
  /** Header actions (ghost sm buttons), before the close button. */
  actions?: ReactNode
  /** Pinned to the bottom (a composer, a primary action). */
  footer?: ReactNode
  /**
   * The child fills the body edge to edge and scrolls itself: a ConversationLog, which brings
   * its own scroller, floating composer and ask dock. Default: a padded scrolling column.
   */
  fill?: boolean
  children: ReactNode
  className?: string
}

function InspectorPane({ title, subtitle, icon, actions, footer, fill = false, children, className, onClose }: InspectorProps & { onClose: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const edges = useScrollEdges(bodyRef)
  return (
    <aside className={cx("glass-panel fa-shell-inspector", className)} aria-label={title}>
      <header className="fa-shell-inspector-header" data-scrolled={edges.top ? "" : undefined}>
        {icon ? <span className="fa-shell-inspector-icon">{icon}</span> : null}
        <div className="fa-shell-inspector-heading">
          <h2 className="fa-shell-inspector-title">{title}</h2>
          {subtitle ? <p className="fa-shell-inspector-subtitle">{subtitle}</p> : null}
        </div>
        {actions}
        <Button variant="ghost" size="sm" icon={<IconClose />} aria-label="Hide inspector" onClick={onClose} />
      </header>
      <div ref={bodyRef} className="fa-shell-inspector-body" data-fill={fill ? "" : undefined} data-scroll-container={fill ? undefined : ""}>
        {children}
      </div>
      {footer ? (
        <footer className="fa-shell-inspector-footer" data-scrolled={edges.bottom ? "" : undefined}>
          {footer}
        </footer>
      ) : null}
    </aside>
  )
}

/** Docked: a glass pane. Narrower than 80rem: the same content in a Sheet. */
export function Inspector(props: InspectorProps) {
  const shell = useShell()
  if (shell.inspectorDocked) return <InspectorPane {...props} onClose={() => shell.setInspectorOpen(false)} />
  const { title, subtitle, icon, actions, footer, fill = false, children } = props
  return (
    <Sheet.Root open={shell.inspectorOpen} onOpenChange={(open) => shell.setInspectorOpen(open)}>
      <Sheet.Popup size="md" aria-label={title}>
        <Sheet.Header icon={icon ? <span className="fa-shell-inspector-icon">{icon}</span> : undefined} title={title} subtitle={subtitle}>
          {actions}
        </Sheet.Header>
        {fill ? <div className="fa-shell-inspector-body" data-fill="">{children}</div> : <Sheet.Body>{children}</Sheet.Body>}
        {footer ? (
          <Sheet.Footer>
            <div className="fa-shell-inspector-sheet-footer">{footer}</div>
          </Sheet.Footer>
        ) : null}
      </Sheet.Popup>
    </Sheet.Root>
  )
}
