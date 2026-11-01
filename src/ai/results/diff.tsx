import { useMessages } from "../../lib/i18n/index.js"
import { useLocale } from "../../lib/locale/use-locale.js"
import { resultsMessages } from "./messages.js"
import { IconColumns } from "../../icons/generated/icons.js"
import { DiffView, diffText } from "../../ui/diff-view/index.js"
import { EntityChip } from "../entity-chip/index.js"
import type { AiResult } from "../types.js"
import { ResultFrame } from "./frame.js"

type DiffResult = Extract<AiResult, { type: "diff" }>

/**
 * A change preview — config, registry or policy — as a unified diff in a result card. The
 * target is a context chip; the counts are the data line. The diff itself is `DiffView`.
 */
export function ResultDiff({ result }: {
  /** The diff result: `lines` in order (added, removed or context), an optional `target` entity shown as a chip, and the title used in the accessible name. */
  result: DiffResult
}) {
  const messages = useMessages(resultsMessages)
  const locale = useLocale()

  const added = result.lines.filter((line) => line.type === "add").length
  const removed = result.lines.filter((line) => line.type === "remove").length
  return (
    <ResultFrame
      result={result}
      icon={<IconColumns />}
      meta={`+${added} −${removed}`}
      copyText={result.lines.length ? () => diffText(result.lines) : undefined}
      flush
    >
      {result.target ? (
        <div className="fa-ai-diff-target">
          <EntityChip entity={result.target} size="sm" />
        </div>
      ) : null}
      <DiffView
        className="fa-ai-diff"
        lines={result.lines}
        label={result.title}
        summary={messages.diffSummary({ title: result.title, added, removed, locale })}
        addedLabel={messages.added}
        removedLabel={messages.removed}
      />
    </ResultFrame>
  )
}
