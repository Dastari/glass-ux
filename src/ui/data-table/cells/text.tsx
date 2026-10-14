import { TruncatedText } from "../../truncated-text/index.js";
import type { ReactNode } from "react";

export interface TextCellProps {
  children: ReactNode;
  /** Identifiers (IP addresses, serials, versions): tabular figures (R8.4). */
  identifier?: boolean;
  /** Secondary text in the muted ink. */
  muted?: boolean;
}

/** Single-line text that truncates with an ellipsis; the full text appears on hover. */
export function TextCell({ children, identifier, muted }: TextCellProps) {
  return (
    <TruncatedText
      className="fa-dt-text"
      data-identifier={identifier ? "" : undefined}
      data-muted={muted ? "" : undefined}
    >
      {children}
    </TruncatedText>
  );
}

/** Two stacked lines: a value and a data subtitle ("Windows 11 Business" / "10.0.26300"). */
export function TwoLineCell({
  title,
  subtitle,
}: {
  title: ReactNode;
  /** Data shown beneath or beside the title. */
  subtitle?: ReactNode;
}) {
  return (
    <span className="fa-dt-two-line">
      <TruncatedText className="fa-dt-text">{title}</TruncatedText>
      {subtitle ? (
        <TruncatedText className="fa-dt-text fa-dt-two-line-sub">
          {subtitle}
        </TruncatedText>
      ) : null}
    </span>
  );
}

/** Shared muted reading for a missing table value. Hosts may supply a domain-specific alternative. */
export const EMPTY_CELL = <TextCell muted>—</TextCell>;
