import { memo, useMemo } from "react"
import { Notice } from "../../ui/notice/index.js"
import { AskCard } from "../asks/index.js"
import { Markdown } from "../markdown/index.js"
import { Reasoning } from "../reasoning/index.js"
import { ResultBlock } from "../results/index.js"
import { SourceList, SourcesProvider } from "../sources/index.js"
import { ToolGroup } from "../tool-activity/index.js"
import type { AiBlock, AiMessage, AiResult } from "../types.js"

/** Results that read better wider than the text: they break out of the reading column (R5.4). */
const WIDE_RESULTS = new Set<AiResult["type"]>(["table", "chart", "images", "diff", "log", "metrics"])

function blockKey(block: AiBlock, index: number) {
  switch (block.kind) {
    case "result":
      return `result:${block.result.id}`
    case "ask":
      return `ask:${block.ask.id}`
    case "tools":
      return `tools:${block.calls[0]?.id ?? index}`
    default:
      return `${block.kind}:${index}`
  }
}

/**
 * An assistant message's blocks in order: reasoning, tool activity, prose, results, asks,
 * notices and sources. Prose and most cards fill the reading column; tables, charts, images,
 * diffs, logs and metrics break out wider (data-breakout). The streaming caret follows the
 * last prose block of a streaming message.
 */
export const MessageBlocks = /* @__PURE__ */ memo(function MessageBlocks({ message }: {
  /** The assistant message whose `blocks` render in order; a `streaming` state puts the caret after its last prose block. */
  message: AiMessage
}) {
  // A stable list keeps citation markers from re-rendering when other message fields change.
  const sources = useMemo(
    () => message.blocks.flatMap((block) => (block.kind === "sources" ? block.sources : [])),
    [message.blocks],
  )
  const lastProse = message.blocks.reduce((last, block, index) => (block.kind === "markdown" ? index : last), -1)
  const streaming = message.state === "streaming"
  return (
    <SourcesProvider sources={sources}>
      {message.blocks.map((block, index) => {
        const key = blockKey(block, index)
        switch (block.kind) {
          case "markdown":
            return <Markdown key={key} className="fa-ai-block" text={block.text} streaming={streaming && index === lastProse} />
          case "reasoning":
            return <Reasoning key={key} className="fa-ai-block" reasoning={block.reasoning} />
          case "tools":
            return <ToolGroup key={key} className="fa-ai-block fa-ai-block-flush" calls={block.calls} />
          case "result":
            return (
              <div key={key} className="fa-ai-block" data-breakout={WIDE_RESULTS.has(block.result.type) ? "" : undefined}>
                <ResultBlock result={block.result} />
              </div>
            )
          case "ask":
            return (
              <div key={key} className="fa-ai-block">
                <AskCard ask={block.ask} />
              </div>
            )
          case "sources":
            return <SourceList key={key} className="fa-ai-block" sources={block.sources} />
          case "notice":
            return (
              <Notice key={key} className="fa-ai-block" tone={block.tone} compact={block.text.length < 90}>
                {block.text}
              </Notice>
            )
        }
      })}
    </SourcesProvider>
  )
})
