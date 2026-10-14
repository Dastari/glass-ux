import { useState } from "react"
import { IconChevronDown, IconChevronUp, IconTerminal } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import { formatNumber } from "../format.js"
import type { AiResult, LogLine } from "../types.js"
import { ResultFrame } from "./frame.js"

type LogResult = Extract<AiResult, { type: "log" }>

/** Lines shown before "Show all n lines" (the tail: the newest lines matter most). */
const TAIL = 10

const LEVEL_WORDS: Record<LogLine["level"], string> = {
  debug: "Debug",
  info: "Info",
  warning: "Warning",
  error: "Error",
  success: "OK",
}

/**
 * Log or terminal output: time, a level word in its tone (the same roles as badges),
 * and the message in monospace. Long output shows its last lines first; expanding shows
 * the rest above. Copy takes every line.
 */
export function ResultLog({ result }: { result: LogResult }) {
  const [expanded, setExpanded] = useState(false)
  const collapsible = result.lines.length > TAIL + 2
  const lines = collapsible && !expanded ? result.lines.slice(-TAIL) : result.lines
  const errors = result.lines.filter((line) => line.level === "error").length
  return (
    <ResultFrame
      result={result}
      icon={<IconTerminal />}
      meta={`${formatNumber(result.lines.length)} lines${errors ? ` · ${errors} ${errors === 1 ? "error" : "errors"}` : ""}`}
      copyText={result.lines.map((line) => [line.time, LEVEL_WORDS[line.level].toUpperCase(), line.text].filter(Boolean).join("  ")).join("\n")}
      flush
    >
      {collapsible ? (
        <div className="fa-ai-log-more">
          <Button variant="ghost" size="sm" icon={expanded ? <IconChevronDown /> : <IconChevronUp />} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
            {expanded ? `Show the last ${TAIL} lines` : `Show ${formatNumber(result.lines.length - TAIL)} earlier lines`}
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
            <span className="fa-ai-log-level">{LEVEL_WORDS[line.level]}</span>
            <span className="fa-ai-log-text">{line.text}</span>
          </li>
        ))}
      </ol>
    </ResultFrame>
  )
}
