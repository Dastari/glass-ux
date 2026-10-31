import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cx } from "../../lib/cx.js";
import { scaledDuration } from "../../lib/motion.js";
import { AiCard, type AiCardTone } from "../card/index.js";
import { RelativeTime } from "../../ui/data-table/cells/relative-time.js";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { EntityChip } from "../entity-chip/index.js";
import { StatusGlyph } from "../tool-activity/index.js";
import type { EntityRef, ToolStatus } from "../types.js";

/** How long a ✓ stays on the button before the ask folds into its record. */
export const RESOLVE_HOLD_MS = 700;

export interface AskLayoutProps {
  /** Labelled-group id root (aria-labelledby). */
  id: string;
  icon: ReactNode;
  tone: AiCardTone;
  title: ReactNode;
  /** Data line under the question: the target, the expiry. */
  meta?: ReactNode;
  /** Content after the body, normally supporting actions. */
  footer?: ReactNode;
  /** Footer start: secondary actions (Skip, Deny). */
  footerStart?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** The second step of a destructive or MFA approval is showing (Esc goes back). */
  confirming?: boolean;
  /** Key handler on the card root, called for keys pressed anywhere inside it; approvals and confirmations use it for Esc to go back. */
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * The body of an ask: an AiCard (icon tile in the ask's tone, the question as the title,
 * controls, footer with the primary on the right). Asks are never modal (R13.8): in a
 * conversation the card sits in the ask dock above the composer; on its own it sits where
 * it is rendered.
 */
export function AskLayout({
  id,
  icon,
  tone,
  title,
  meta,
  footer,
  footerStart,
  children,
  className,
  confirming = false,
  onKeyDown,
}: AskLayoutProps) {
  return (
    <AiCard.Root
      tone={tone}
      className={cx("fa-ai-ask", className)}
      role="group"
      aria-labelledby={`${id}-title`}
      data-confirming={confirming ? "" : undefined}
      onKeyDown={onKeyDown}
    >
      <AiCard.Header
        icon={icon}
        iconTile
        title={<span id={`${id}-title`}>{title}</span>}
        meta={meta}
      />
      {children ? (
        <AiCard.Body className="fa-ai-ask-body">{children}</AiCard.Body>
      ) : null}
      {footer || footerStart ? (
        <AiCard.Footer className="fa-ai-ask-footer">
          {footerStart ? (
            <div className="fa-ai-ask-footer-start">{footerStart}</div>
          ) : null}
          {footer}
        </AiCard.Footer>
      ) : null}
    </AiCard.Root>
  );
}

export interface AskRecordProps {
  /** Current operation or connection status. */
  status: ToolStatus;
  /** What was decided, in words: "Chose Ricoh IM C3000 · Level 2". */
  children: ReactNode;
  /** Who and when: "Avery Quinn · 10:44 am". */
  by?: string;
  /** Resolved actor identity, preferred over the legacy display name. */
  actor?: EntityRef;
  /** Time associated with the record. */
  at?: number;
  /** One trailing action (Ask again, Open). */
  action?: ReactNode;
  /** Replace the status glyph (a pending question shows IconHelp, not the approval shield). */
  glyph?: ReactNode;
  className?: string;
}

/** The compact record an ask folds into once it is answered, approved, denied or expired. */
export function AskRecord({
  status,
  children,
  by,
  actor,
  at,
  action,
  glyph,
  className,
}: AskRecordProps) {
  return (
    <div
      className={cx("fa-ai-ask-record", className)}
      data-status={status}
      role="status"
    >
      {glyph ?? <StatusGlyph status={status} />}
      <span className="fa-ai-ask-record-text">{children}</span>
      {actor || by || at !== undefined ? (
        // The relative time keeps ticking; it is not re-announced as part of the status.
        <span className="fa-ai-ask-record-meta" aria-live="off">
          {actor ? (
            <EntityChip entity={actor} size="sm" />
          ) : by ? (
            <TruncatedText>{by}</TruncatedText>
          ) : null}
          {at !== undefined ? <RelativeTime value={at} /> : null}
        </span>
      ) : null}
      {action}
    </div>
  );
}

/**
 * Folds an ask into its record: the box animates from the ask's height to the record's
 * (--duration-slow), so resolving never jumps; while the conversation is pinned to the
 * bottom, the content above moves instead of the messages below (see ConversationLog).
 */
export function AskShell({
  resolved,
  record,
  children,
}: {
  /** Resolved state of the request. */
  resolved: boolean;
  /** Resolved request or audit record displayed by the component. */
  record: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const recordRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"open" | "closing" | "closed">(
    resolved ? "closed" : "open",
  );
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (resolved && phase === "open") {
      setHeight(ref.current?.offsetHeight ?? null);
      setPhase("closing");
    }
    if (!resolved && phase !== "open") {
      setPhase("open");
      setHeight(null);
    }
  }, [resolved, phase]);

  useLayoutEffect(() => {
    if (phase !== "closing") return;
    const element = ref.current;
    const target = recordRef.current?.offsetHeight;
    if (!element || target === undefined) return;
    // Commit the starting height, then move to the record's height on the next frame.
    void element.offsetHeight;
    const frame = requestAnimationFrame(() => setHeight(target));
    const done = () => {
      setPhase("closed");
      setHeight(null);
    };
    const fallback = setTimeout(done, scaledDuration(1000) + 50);
    element.addEventListener("transitionend", done, { once: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fallback);
      element.removeEventListener("transitionend", done);
    };
  }, [phase]);

  return (
    <div
      ref={ref}
      className="fa-ai-ask-shell"
      data-phase={phase}
      style={height !== null ? { height } : undefined}
    >
      {phase === "open" ? children : <div ref={recordRef}>{record}</div>}
    </div>
  );
}
