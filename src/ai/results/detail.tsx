import { IconList } from "../../icons/generated/icons.js"
import { DetailGrid, DetailTile } from "../../ui/detail-tile/index.js"
import type { AiResult } from "../types.js"
import { ResultFrame } from "./frame.js"
import { Redacted } from "./generic.js"

type DetailResult = Extract<AiResult, { type: "detail" }>

/** Key–value facts as DetailTiles in a DetailGrid that reflows with the card. */
export function ResultDetail({ result }: {
  /** The detail result: its `items` become tiles in order; redacted items show the withheld treatment and are left out of Copy. */
  result: DetailResult
}) {
  return (
    <ResultFrame result={result} icon={<IconList />} copyText={result.items.filter((item) => !item.redacted).map((item) => `${item.label}: ${item.value}${item.detail ? ` (${item.detail})` : ""}`).join("\n")}>
      <DetailGrid min="sm" className="fa-ai-detail-grid">
        {result.items.map((item) => {
          const Icon = item.icon
          return (
            <DetailTile
              key={item.label}
              label={item.label}
              value={item.redacted ? <Redacted value={item.redacted} /> : item.value}
              detail={item.detail}
              numeric={item.numeric}
              truncate={item.numeric}
              icon={Icon ? <Icon /> : undefined}
            />
          )
        })}
      </DetailGrid>
    </ResultFrame>
  )
}
