import { useMessages } from "../../lib/i18n/index.js"
import { reasoningMessages } from "./messages.js"
import { Collapsible } from "@base-ui/react/collapsible"
import { useState } from "react"
import { IconChevronRight, IconLightbulb } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { formatElapsed, useNow } from "../format.js"
import type { AiReasoning } from "../types.js"
import { useLocale } from "../../lib/locale/use-locale.js"

export interface ReasoningProps {
  /** Assistant reasoning content and its visibility state. */
  reasoning: AiReasoning
  defaultOpen?: boolean
  className?: string
}

/**
 * The model's reasoning summary (provider_activity · reasoning_summary), collapsed to one
 * line: "Thought for 4 s". While it runs the line reads "Thinking" with a live count, and
 * the summary can be opened to follow along. Never the hidden chain of thought — only the
 * summary the provider chose to show.
 */
export function Reasoning({ reasoning, defaultOpen = false, className }: ReasoningProps) {
  const messages = useMessages(reasoningMessages)

  const running = Boolean(reasoning.running)
  const [started] = useState(() => Date.now() - reasoning.seconds * 1000)
  const now = useNow(running, 1000)
  const locale = useLocale()
  const seconds = running ? Math.max(reasoning.seconds, (now - started) / 1000) : reasoning.seconds
  const time = seconds < 60 ? `${Math.max(1, Math.round(seconds))}\u2009s` : formatElapsed(Math.round(seconds) * 1000, locale)
  return (
    <Collapsible.Root className={cx("fa-ai-reasoning", className)} defaultOpen={defaultOpen} data-running={running ? "" : undefined}>
      <Collapsible.Trigger className="fa-ai-reasoning-trigger">
        <IconLightbulb className="fa-ai-reasoning-icon" />
        <span className="fa-ai-reasoning-label">
          {running ? messages.thinking : messages.thoughtFor} <span data-numeric>{time}</span>
        </span>
        <IconChevronRight className="fa-ai-reasoning-chevron" />
      </Collapsible.Trigger>
      <Collapsible.Panel className="fa-collapse fa-ai-reasoning-panel">
        <p className="fa-ai-reasoning-text">{reasoning.summary}</p>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}
