import { cx } from "../../lib/cx.js"
import { useEntityResolver } from "../entity-chip/index.js"
import { Skeleton } from "../../ui/skeleton/index.js"
import { AiCard } from "../card/index.js"
import type { AiResult } from "../types.js"
import { ResultChart } from "./chart.js"
import { ResultDetail } from "./detail.js"
import { ResultDiff } from "./diff.js"
import { ResultEntities, ResultEntity } from "./entity.js"
import { ResultFiles } from "./files.js"
import { resolvePreview, ResultJson, ResultValue, type ToolPreview } from "./generic.js"
import { ResultImages } from "./images.js"
import { ResultLog } from "./log.js"
import { ResultMetrics } from "./metrics.js"
import { INLINE_ROWS, ResultTable } from "./table.js"

/** Render any tool result by its type. */
export function ResultBlock({ result }: { result: AiResult }) {
  switch (result.type) {
    case "table":
      return <ResultTable result={result} />
    case "metrics":
      return <ResultMetrics result={result} />
    case "chart":
      return <ResultChart result={result} />
    case "detail":
      return <ResultDetail result={result} />
    case "entity":
      return <ResultEntity result={result} />
    case "entities":
      return <ResultEntities result={result} />
    case "images":
      return <ResultImages result={result} />
    case "files":
      return <ResultFiles result={result} />
    case "diff":
      return <ResultDiff result={result} />
    case "log":
      return <ResultLog result={result} />
    case "value":
      return <ResultValue result={result} />
    case "json":
      return <ResultJson result={result} />
  }
}

/**
 * A tool's browser preview (AiToolCallResultPreview) rendered schema-first: the disclosure
 * picks table, detail, value or redaction, and recognised Glass UX types upgrade to entity
 * cards and lists (resolvePreview).
 */
export function GenericResult({ preview }: { preview: ToolPreview }) {
  const resolver = useEntityResolver()
  return <ResultBlock result={resolvePreview(preview, resolver)} />
}

export interface ResultSkeletonProps {
  /** Semantic content or control type. */
  type: AiResult["type"]
  /** Table and list rows; image count. */
  count?: number
  className?: string
}

/**
 * The exact box of a result before its data arrives: the same card, header and body shape
 * (row count, chart height, image ratio), so the result replaces it without moving
 * anything below (R9.3).
 */
export function ResultSkeleton({ type, count, className }: ResultSkeletonProps) {
  const rows = count ?? (type === "table" ? INLINE_ROWS : 4)
  return (
    <AiCard.Root breakout className={cx("fa-ai-result", className)} data-type={type} aria-busy="true" aria-label="Loading result">
      <header className="fa-ai-card-header" aria-hidden>
        <Skeleton.Block width="var(--icon-sm)" height="var(--icon-sm)" radius="item" />
        <div className="fa-ai-card-heading">
          <Skeleton.Text type="label" width="38%" />
          <Skeleton.Text type="caption" width="22%" />
        </div>
      </header>
      <div className="fa-ai-card-body fa-ai-result-body" data-flush={type === "table" || type === "entities" || type === "log" ? "" : undefined} aria-hidden>
        {type === "table" ? (
          <div className="fa-ai-skel-table">
            <Skeleton.Block className="fa-ai-skel-head" radius="control" />
            {Array.from({ length: rows }, (_, index) => (
              <div key={index} className="fa-ai-skel-row">
                <Skeleton.Text type="body" width={`${55 + ((index * 17) % 30)}%`} />
              </div>
            ))}
          </div>
        ) : type === "chart" ? (
          <Skeleton.Block className="fa-ai-skel-chart" radius="tile" />
        ) : type === "metrics" ? (
          <div className="fa-ai-metrics">
            {Array.from({ length: Math.min(rows, 4) }, (_, index) => (
              <Skeleton.Block key={index} className="fa-ai-metric-tile" radius="tile" />
            ))}
          </div>
        ) : type === "images" ? (
          <div className="fa-ai-images">
            {Array.from({ length: count ?? 3 }, (_, index) => (
              <Skeleton.Block key={index} className="fa-ai-skel-image" radius="control" />
            ))}
          </div>
        ) : (
          <div className="fa-ai-skel-lines">
            {Array.from({ length: rows }, (_, index) => (
              <Skeleton.Text key={index} type={type === "log" || type === "diff" ? "mono" : "body"} width={`${48 + ((index * 23) % 40)}%`} />
            ))}
          </div>
        )}
      </div>
    </AiCard.Root>
  )
}
