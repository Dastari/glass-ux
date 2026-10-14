import { IconColumns } from "../../icons/generated/icons.js"
import { EntityChip } from "../entity-chip/index.js"
import type { AiResult } from "../types.js"
import { ResultFrame } from "./frame.js"

type DiffResult = Extract<AiResult, { type: "diff" }>

const SIGN = { add: "+", remove: "−", context: " " } as const

/**
 * A change preview — config, registry or policy — as a unified diff: removed lines on the
 * danger tint, added lines on the success tint, the sign in the gutter so the change reads
 * without colour too. The target is a context chip; the counts are the data line.
 */
export function ResultDiff({ result }: { result: DiffResult }) {
  const added = result.lines.filter((line) => line.type === "add").length
  const removed = result.lines.filter((line) => line.type === "remove").length
  const numbered: Array<{ before: number; after: number }> = []
  for (const line of result.lines) {
    const last = numbered[numbered.length - 1] ?? { before: 0, after: 0 }
    numbered.push({ before: last.before + (line.type === "add" ? 0 : 1), after: last.after + (line.type === "remove" ? 0 : 1) })
  }
  return (
    <ResultFrame
      result={result}
      icon={<IconColumns />}
      meta={`+${added} −${removed}`}
      copyText={result.lines.map((line) => `${line.type === "add" ? "+" : line.type === "remove" ? "-" : " "} ${line.text}`).join("\n")}
      flush
    >
      {result.target ? (
        <div className="fa-ai-diff-target">
          <EntityChip entity={result.target} size="sm" />
        </div>
      ) : null}
      <div
        className="fa-ai-diff"
        role="region"
        aria-label={`${result.title}: ${added} added, ${removed} removed`}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- long lines scroll sideways (R20.6)
        tabIndex={0}
      >
        <div role="table" aria-label={result.title} className="fa-ai-diff-rows">
        {result.lines.map((line, index) => {
          const { before, after } = numbered[index]!
          return (
            <div key={index} className="fa-ai-diff-line" data-type={line.type} role="row">
              <span className="fa-ai-diff-number" role="cell" aria-hidden data-numeric>
                {line.type === "add" ? "" : before}
              </span>
              <span className="fa-ai-diff-number" role="cell" aria-hidden data-numeric>
                {line.type === "remove" ? "" : after}
              </span>
              <span className="fa-ai-diff-sign" role="cell" aria-label={line.type === "add" ? "Added" : line.type === "remove" ? "Removed" : undefined}>
                {SIGN[line.type]}
              </span>
              <span className="fa-ai-diff-text" role="cell">
                {line.text || "​"}
              </span>
            </div>
          )
        })}
        </div>
      </div>
    </ResultFrame>
  )
}
