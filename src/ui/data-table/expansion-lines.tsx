import { useDataTableMessages } from "./use-messages.js";
import {
  memo,
  useEffect,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { useAnnounce } from "../../hooks/use-announce.js";
import { cx } from "../../lib/cx.js";
import { Button } from "../button/index.js";
import { useLocale } from "../../lib/locale/use-locale.js";
import { RetryButton, SkeletonRow } from "./body.js";
import { SkeletonCards, type CardLayout } from "./cards.js";
import type { ChildStatus } from "./expansion.js";
import { formatNumber } from "./format.js";
import type { ColumnInfo } from "./row.js";
import { levelStyle } from "./row-expander.js";

/** Keeps the shared live region mounted while a tree table is. */
export function ChildAnnouncer() {
  useAnnounce();
  return null;
}

/** The treegrid attributes of a line that is not a sibling among rows. */
const levelAttributes = (treegrid: boolean, level: number) =>
  treegrid ? { "aria-level": level } : undefined;

interface LineProps {
  /** Label of the row the line belongs to. */
  label: string;
  rowId: string;
  index: number;
  ariaRowIndex: number;
  /** Offset from the top of the body (px); undefined in the card list. */
  top?: number;
  active: boolean;
  colSpan: number;
  level: number;
  /** The grid is a treegrid. */
  treegrid: boolean;
}

function DetailLineView({
  label,
  rowId,
  index,
  ariaRowIndex,
  top,
  active,
  colSpan,
  level,
  treegrid,
  panelId,
  measureRef,
  children,
}: LineProps & {
  panelId: string;
  /** The virtualizer measures the line. */
  measureRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  const m = useDataTableMessages();
  return (
    <div
      ref={measureRef}
      role="row"
      className="fa-dt-row fa-dt-panel-row"
      aria-rowindex={ariaRowIndex}
      {...levelAttributes(treegrid, level)}
      tabIndex={active ? 0 : -1}
      data-index={index}
      data-item="detail"
      data-for-row={rowId}
      style={{
        ...levelStyle(level - 1),
        transform: top === undefined ? undefined : `translateY(${top}px)`,
      }}
    >
      <div
        role="gridcell"
        id={panelId}
        className="fa-dt-panel-cell"
        aria-colspan={colSpan}
      >
        <span className="fa-dt-sr">{m.rowDetails(label)}</span>
        <div className="glass-inset fa-dt-panel" data-dt-panel="">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * The host's panel under a row. Memoised, so scrolling past it never redraws it: the content
 * only renders again when the host's row or `renderRowDetail` changes.
 */
export const DetailLine = /* @__PURE__ */ memo(function DetailContent<T>({
  render,
  original,
  ...line
}: LineProps & {
  panelId: string;
  measureRef?: Ref<HTMLDivElement>;
  render: (row: T) => ReactNode;
  original: T;
}) {
  return <DetailLineView {...line}>{render(original)}</DetailLineView>;
}) as <T>(
  props: LineProps & {
    panelId: string;
    measureRef?: Ref<HTMLDivElement>;
    render: (row: T) => ReactNode;
    original: T;
  },
) => ReactElement;

/**
 * A branch's children on their way: placeholder rows in the space they will take, or the
 * failure with Retry over the same space, so neither moves what follows. Mounting it asks for
 * them, so only an open branch on screen loads.
 */
export function ChildStatusLine({
  label,
  rowId,
  index,
  ariaRowIndex,
  top,
  active,
  colSpan,
  level,
  treegrid,
  lines,
  status,
  columns,
  selectable,
  grip,
  expanderColumn,
  cards,
  actions,
  onRequest,
  onRetry,
}: LineProps & {
  /** Row heights to hold. */
  lines: number;
  status: ChildStatus;
  /** The visible columns, for the placeholders' cells. */
  columns: readonly ColumnInfo[];
  selectable: boolean;
  grip: boolean;
  expanderColumn: string | undefined;
  /** The card layout, in the card list. */
  cards?: CardLayout;
  /** Reserve the row-action controls on cards. */
  actions: boolean;
  onRequest: () => void;
  onRetry: () => void;
}) {
  const m = useDataTableMessages();
  const failed = status === "failed";
  useEffect(() => {
    if (status === "idle") onRequest();
  }, [status, onRequest]);
  return (
    <div
      role="row"
      className="fa-dt-row fa-dt-status-row"
      aria-rowindex={ariaRowIndex}
      aria-busy={!failed || undefined}
      {...levelAttributes(treegrid, level)}
      tabIndex={active ? 0 : -1}
      data-index={index}
      data-item="child-status"
      data-for-row={rowId}
      data-state={failed ? "error" : "loading"}
      style={{
        ...levelStyle(level),
        "--fa-dt-status-lines": lines,
        transform: top === undefined ? undefined : `translateY(${top}px)`,
      } as CSSProperties}
    >
      <div role="gridcell" className="fa-dt-status-cell" aria-colspan={colSpan}>
        <div className="fa-dt-status-shape" aria-hidden>
          {cards ? (
            <SkeletonCards
              count={lines}
              layout={cards}
              selectable={selectable}
              actions={actions}
              grip={grip}
            />
          ) : (
            Array.from({ length: lines }, (_, line) => (
              <SkeletonRow
                key={line}
                seed={line}
                top={`calc(var(--_row-h) * ${line})`}
                columns={columns}
                selectable={selectable}
                grip={grip}
                expanderColumn={expanderColumn}
              />
            ))
          )}
        </div>
        {failed ? (
          <div className="fa-dt-load-cell fa-dt-status-message">
            <span className="fa-dt-load-text">{m.childrenFailed(label)}</span>
            <RetryButton onRetry={onRetry} />
          </div>
        ) : (
          <span className="fa-dt-sr">{m.childrenLoading(label)}</span>
        )}
      </div>
    </div>
  );
}

/** "Show more" under a parent the server has more children for, with how many are loaded. */
export function ChildMoreLine({
  label,
  rowId,
  index,
  ariaRowIndex,
  top,
  active,
  colSpan,
  level,
  treegrid,
  loaded,
  total,
  status,
  onMore,
}: LineProps & {
  loaded: number;
  total: number | undefined;
  status: ChildStatus;
  onMore: () => void;
}) {
  const m = useDataTableMessages();
  const locale = useLocale();
  const tabIndex = active ? 0 : -1;
  const failed = status === "failed";
  return (
    <div
      role="row"
      className={cx("fa-dt-row", "fa-dt-more-row", "fa-dt-child-more")}
      aria-rowindex={ariaRowIndex}
      {...levelAttributes(treegrid, level)}
      tabIndex={tabIndex}
      data-index={index}
      data-item="child-more"
      data-for-row={rowId}
      data-state={failed ? "error" : undefined}
      style={{
        ...levelStyle(level),
        transform: top === undefined ? undefined : `translateY(${top}px)`,
      }}
    >
      <div role="gridcell" className="fa-dt-more-cell" aria-colspan={colSpan}>
        {failed ? (
          <>
            <span className="fa-dt-load-text">{m.childrenFailed(label)}</span>
            <RetryButton onRetry={onMore} />
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="fa-dt-more-button"
            status={status === "loading" ? "pending" : "idle"}
            tabIndex={tabIndex}
            data-dt-interactive=""
            aria-label={m.showMoreUnder(label)}
            onClick={onMore}
          >
            {m.showMoreChildren}
          </Button>
        )}
        {total === undefined || failed ? null : (
          <span className="fa-dt-more-meta" data-numeric>
            {m.loadedOf(
              formatNumber(loaded, 0, locale),
              formatNumber(total, 0, locale),
            )}
          </span>
        )}
      </div>
    </div>
  );
}
