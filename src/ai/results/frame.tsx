import { useMessages } from "../../lib/i18n/index.js"
import { resultsMessages } from "./messages.js"
import type { ReactNode } from "react"
import { IconDownload, IconPopOut } from "../../icons/generated/icons.js"
import { Button } from "../../ui/button/index.js"
import { CopyButton } from "../../ui/copy-button/index.js"
import { AiCard } from "../card/index.js"
import { useConversationHandlers } from "../handlers.js"
import type { AiResult } from "../types.js"

export interface ResultFrameProps {
  /** Typed result, including disclosure and rendering metadata. */
  result: AiResult
  icon: ReactNode
  /** Data line after the source: "8 of 1,284", "3 images". */
  meta?: string
  /** Text for the copy action; omit to hide it. */
  copyText?: string
  /** CSV for export; omit to hide it. */
  csv?: string
  /** Content after the body, normally supporting actions. */
  footer?: ReactNode
  /** Remove the body inset (tables, images). */
  flush?: boolean
  children: ReactNode
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "result"

/**
 * The frame every tool-rendered result shares: an AiCard on the breakout column with a
 * compact header — glyph, title, data meta (source · count) — and the same three actions
 * in the same order: copy, export CSV, open in window.
 */
export function ResultFrame({ result, icon, meta, copyText, csv, footer, flush = false, children }: ResultFrameProps) {
  const messages = useMessages(resultsMessages)

  const handlers = useConversationHandlers()
  const line = [result.source, meta].filter(Boolean).join(" · ")
  return (
    <AiCard.Root breakout className="fa-ai-result" data-type={result.type} role="group" aria-label={result.title}>
      <AiCard.Header
        icon={icon}
        title={result.title}
        meta={line || undefined}
        actions={
          <>
            {copyText ? <CopyButton value={copyText} label={messages.copy} /> : null}
            {csv ? (
              <Button variant="ghost" size="sm" icon={<IconDownload />} aria-label={messages.exportCsv} onClick={() => download(`${slug(result.title)}.csv`, csv)} />
            ) : null}
            <Button variant="ghost" size="sm" icon={<IconPopOut />} aria-label={messages.openInAWindow} onClick={() => handlers.openResultWindow(result)} />
          </>
        }
      />
      <AiCard.Body flush={flush} className="fa-ai-result-body">
        {children}
      </AiCard.Body>
      {footer ? <AiCard.Footer className="fa-ai-result-footer">{footer}</AiCard.Footer> : null}
    </AiCard.Root>
  )
}
