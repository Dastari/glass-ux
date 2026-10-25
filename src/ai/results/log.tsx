import { useMessages } from "../../lib/i18n/index.js"
import { resultsMessages } from "./messages.js"
import { useState } from "react"
import { IconChevronDown, IconChevronUp, IconTerminal } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import { formatNumber } from "../format.js"
import type { AiResult, LogLine } from "../types.js"
import { ResultFrame } from "./frame.js"
import { useLocale } from "../../lib/locale/use-locale.js"

type LogResult = Extract<AiResult, { type: "log" }>

/** Lines shown before "Show all n lines" (the tail: the newest lines matter most). */
const TAIL = 10

function getLEVEL_WORDS(messages: typeof resultsMessages.defaults): Record<LogLine["level"], string> { return {
  debug: messages.debug,
  info: messages.info,
  warning: messages.warning,
  error: messages.error,
  success: "OK",
} }


/**
 * Log or terminal output: time, a level word in its tone (the same roles as badges),
 * and the message in monospace. Long output shows its last lines first; expanding shows
 * the rest above. Copy takes every line.
 */
export function ResultLog({ result }: {
  /** The log result: `lines` in order, each with a level, the text and an optional time; the line and error counts are the data line. */
  result: LogResult
}) {
  const messages = useMessages(resultsMessages)

  const locale = useLocale()
  const [expanded, setExpanded] = useState(false)
  const collapsible = result.lines.length > TAIL + 2
  const lines = collapsible && !expanded ? result.lines.slice(-TAIL) : result.lines
  const errors = result.lines.filter((line) => line.level === "error").length
  return (
    <ResultFrame
      result={result}
      icon={<IconTerminal />}
      meta={[messages.lineCount(result.lines.length, locale), errors ? messages.errorCount(errors, locale) : ""].filter(Boolean).join(" · ")}
      copyText={result.lines.map((line) => [line.time, getLEVEL_WORDS(messages)[line.level].toUpperCase(), line.text].filter(Boolean).join("  ")).join("\n")}
      flush
    >
      {collapsible ? (
        <div className="fa-ai-log-more">
          <Button variant="ghost" size="sm" icon={expanded ? <IconChevronDown /> : <IconChevronUp />} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
            {expanded ? messages.showTheLastLines(TAIL) : messages.showEarlierLines(formatNumber(result.lines.length - TAIL, 0, locale))}
          </Button>
        </div>
      ) : null}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrolls sideways (R20.6) */}
      <ol className="fa-ai-log" tabIndex={0} aria-label={result.title}>
        {lines.map((line, index) => (
          <li key={index} className="fa-ai-log-line" data-level={line.level}>
            {line.time ? (
              <time className="fa-ai-log-time" data-numeric>
                {line.time}
              </time>
            ) : null}
            <span className="fa-ai-log-level">{getLEVEL_WORDS(messages)[line.level]}</span>
            <span className="fa-ai-log-text">{line.text}</span>
          </li>
        ))}
      </ol>
    </ResultFrame>
  )
}
