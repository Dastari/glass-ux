import type { ReactNode } from "react"

export interface TextCellProps {
  children: ReactNode
  /** Identifiers (IP addresses, serials, versions): tabular figures (R8.4). */
  identifier?: boolean
  /** Secondary text in the muted ink. */
  muted?: boolean
}

/** Single-line text that truncates with an ellipsis; the full text appears on hover. */
export function TextCell({ children, identifier, muted }: TextCellProps) {
  return (
    <span className="fa-dt-text" data-identifier={identifier ? "" : undefined} data-muted={muted ? "" : undefined}>
      {children}
    </span>
  )
}

/** Two stacked lines: a value and a data subtitle ("Windows 11 Business" / "10.0.26300"). */
export function TwoLineCell({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <span className="fa-dt-two-line">
      <span className="fa-dt-text">{title}</span>
      {subtitle ? <span className="fa-dt-text fa-dt-two-line-sub">{subtitle}</span> : null}
    </span>
  )
}
