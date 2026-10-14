import type { ComponentProps, ReactNode } from "react"
import { cx } from "../../lib/cx.js"
import { AiMark } from "../ai-mark/index.js"

export interface AssistantPaneProps extends Omit<ComponentProps<"aside">, "title"> {
  /** "Assistant". */
  title?: string
  /** The scope as data (R2.2): "NST-C106", "Northstar Studio". */
  scope?: ReactNode
  /** Ghost sm buttons before the window controls: new chat, history, open full page. */
  actions?: ReactNode
  /** The conversation (a ConversationLog with surface="panel" and the composer footer). */
  children: ReactNode
  /** Marks the assistant as working; motion follows the appearance preference. */
  working?: boolean
}

/**
 * The assistant docked beside a page or opened as a window: a glass pane with the AI mark,
 * the title and the scope it is pinned to, header actions, then the conversation filling the
 * rest. Everything inside is container-aware down to 20rem; the pane sets no widths itself.
 */
export function AssistantPane({ title = "Assistant", scope, actions, working = false, children, className, ...rest }: AssistantPaneProps) {
  return (
    <aside {...rest} className={cx("glass-panel fa-ai-pane", className)} aria-label={title}>
      <header className="fa-ai-pane-header">
        <AiMark size="md" working={working} />
        <div className="fa-ai-pane-heading">
          <h2 className="fa-ai-pane-title">{title}</h2>
          {scope ? <p className="fa-ai-pane-scope">{scope}</p> : null}
        </div>
        {actions ? <div className="fa-ai-pane-actions">{actions}</div> : null}
      </header>
      <div className="fa-ai-pane-body">{children}</div>
    </aside>
  )
}
