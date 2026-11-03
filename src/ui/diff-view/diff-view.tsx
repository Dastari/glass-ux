import type { ComponentProps } from "react"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { diffViewMessages } from "./messages.js"

/** One line of a unified diff. */
export interface DiffLine {
  /** Added, removed or unchanged. */
  type: "add" | "remove" | "context"
  /** The line's text, without its sign. */
  text: string
  /** The number in the old text, where a hunk does not start at 1. Later lines count on from it. */
  before?: number
  /** The number in the new text, where a hunk does not start at 1. Later lines count on from it. */
  after?: number
}

export interface DiffViewProps extends Omit<ComponentProps<"div">, "children" | "role" | "aria-label"> {
  /** The lines in order. */
  lines: readonly DiffLine[]
  /** Names the change: what the diff is of. */
  label: string
  /** The scrolling region's accessible name. Default: the label and the counts of added and removed lines. */
  summary?: string
  /** The sign's spoken name on an added line. Default "Added". */
  addedLabel?: string
  /** The sign's spoken name on a removed line. Default "Removed". */
  removedLabel?: string
}

const SIGN = { add: "+", remove: "−", context: " " } as const

/** Plain text of the lines with ASCII signs, for a copy action. */
export function diffText(lines: readonly DiffLine[]): string {
  return lines.map((line) => `${line.type === "add" ? "+" : line.type === "remove" ? "-" : " "} ${line.text}`).join("\n")
}

/**
 * A unified diff: removed lines on one tint and added lines on another, with the sign in the
 * gutter so a change reads without colour too. Both line numbers show in a wide box; below
 * 25rem they drop and the sign stays. Long lines scroll sideways, and the region is keyboard
 * scrollable (R20.6). It is a table of rows; line numbers stay out of what is read aloud.
 *
 * The tints are token roles, `--code-add-tint` and `--code-remove-tint`, with the matching text
 * colours `--code-add-text` and `--code-remove-text`, so a diff drawn elsewhere can match.
 */
export function DiffView({ lines, label, summary, addedLabel, removedLabel, className, ...rest }: DiffViewProps) {
  const messages = useMessages(diffViewMessages)
  const locale = useLocale()
  const added = lines.filter((line) => line.type === "add").length
  const removed = lines.filter((line) => line.type === "remove").length
  const numbered: Array<{ before: number; after: number }> = []
  for (const line of lines) {
    const last = numbered[numbered.length - 1] ?? { before: 0, after: 0 }
    numbered.push({
      before: line.before ?? last.before + (line.type === "add" ? 0 : 1),
      after: line.after ?? last.after + (line.type === "remove" ? 0 : 1),
    })
  }
  return (
    // Code reads left to right in any page; a host can still pass its own dir.
    <div
      dir="ltr"
      {...rest}
      className={cx("fa-diff", className)}
      role="region"
      aria-label={summary ?? messages.summary({ label, added, removed, locale })}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- long lines scroll sideways (R20.6)
      tabIndex={0}
    >
      <div role="table" aria-label={label} className="fa-diff-rows">
        {lines.map((line, index) => {
          const { before, after } = numbered[index]!
          return (
            <div key={index} className="fa-diff-line" data-type={line.type} role="row">
              <span className="fa-diff-number" role="cell" aria-hidden data-numeric>
                {line.type === "add" ? "" : before}
              </span>
              <span className="fa-diff-number" role="cell" aria-hidden data-numeric>
                {line.type === "remove" ? "" : after}
              </span>
              <span
                className="fa-diff-sign"
                role="cell"
                aria-label={line.type === "add" ? (addedLabel ?? messages.added) : line.type === "remove" ? (removedLabel ?? messages.removed) : undefined}
              >
                {SIGN[line.type]}
              </span>
              <span className="fa-diff-text" role="cell">
                {line.text || "​"}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
