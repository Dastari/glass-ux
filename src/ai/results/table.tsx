import { useMessages } from "../../lib/i18n/index.js"
import { resultsMessages, getResultsMessages } from "./messages.js"
import { IconGrid, IconPopOut } from "../../icons/generated/icons.js";
import {
  Badge,
  StatusBadge,
  type StatusKind,
} from "../../ui/badge/index.js";
import { Button } from "../../ui/button/index.js";
import { EMPTY_CELL, TextCell } from "../../ui/data-table/cells/text.js";
import { NumericCell } from "../../ui/data-table/cells/numeric.js";
import { RelativeTime } from "../../ui/data-table/cells/relative-time.js";
import { EntityChip } from "../entity-chip/index.js";
import { formatNumber } from "../format.js";
import { useConversationHandlers } from "../handlers.js";
import { TableScroll } from "../table/index.js";
import type {
  AiResult,
  EntityRef,
  RedactedValue,
  ResultColumn,
  ResultRow,
} from "../types.js";
import { ResultFrame } from "./frame.js";
import { Redacted } from "./generic.js";
import { useLocale } from "../../lib/locale/use-locale.js";

type TableResult = Extract<AiResult, { type: "table" }>;

/** Rows shown inline before "Show all n in a window". */
export const INLINE_ROWS = 8;

const isEntity = (value: unknown): value is EntityRef =>
  typeof value === "object" &&
  value !== null &&
  "kind" in value &&
  "label" in value;
const isRedacted = (value: unknown): value is RedactedValue =>
  typeof value === "object" && value !== null && "redacted" in value;

function cellText(column: ResultColumn, value: ResultRow[string]): string {
  if (value === null || value === undefined) return "";
  if (isRedacted(value)) return getResultsMessages().hiddenStatus;
  if (isEntity(value)) return value.label;
  if (column.type === "time" && typeof value === "number")
    return new Date(value).toISOString();
  if (typeof value === "number")
    return column.unit ? `${value} ${column.unit}` : String(value);
  return String(value);
}

function Cell({
  column,
  value,
}: {
  column: ResultColumn;
  value: ResultRow[string];
}) {
  if (value === null || value === undefined) return EMPTY_CELL;
  if (isRedacted(value)) return <Redacted value={value} />;
  // An entity reads as its chip in any column, so an untyped column never shows "[object Object]".
  if (isEntity(value)) return <EntityChip entity={value} variant="plain" />;
  switch (column.type) {
    case "status":
      return <StatusBadge status={String(value) as StatusKind} size="sm" />;
    case "badge":
      return <Badge size="sm">{String(value)}</Badge>;
    case "time":
      return <RelativeTime value={value as number} />;
    case "number":
      return typeof value === "number" ? (
        <NumericCell
          value={value}
          unit={column.unit}
          fractionDigits={Number.isInteger(value) ? 0 : 1}
        />
      ) : (
        <TextCell>{String(value)}</TextCell>
      );
    default:
      return <TextCell>{String(value)}</TextCell>;
  }
}

function toCsv(result: TableResult) {
  const escape = (text: string) =>
    /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  const head = result.columns.map((column) => escape(column.header)).join(",");
  const body = result.rows.map((row) =>
    result.columns
      .map((column) => escape(cellText(column, row[column.key])))
      .join(","),
  );
  return [head, ...body].join("\n");
}

function toText(result: TableResult) {
  return [
    result.columns.map((column) => column.header).join("\t"),
    ...result.rows.map((row) =>
      result.columns
        .map((column) => cellText(column, row[column.key]))
        .join("\t"),
    ),
  ].join("\n");
}

/**
 * A table result: the first rows inline in the AI table style, columns stepping away by
 * priority as the card narrows, and rows becoming a compact list in very narrow cards.
 * "Show all 1,284" opens the full DataTable in a window.
 */
export function ResultTable({ result }: {
  /** The table result: `columns`, `rows` (the first 8 show inline), `total` for the count and Show all, and an optional row `noun`. */
  result: TableResult;
}) {
  const messages = useMessages(resultsMessages)

  const locale = useLocale();
  const handlers = useConversationHandlers();
  const rows = result.rows.slice(0, INLINE_ROWS);
  const noun = result.noun ?? { one: messages.row, other: messages.rows };
  const meta =
    result.total > rows.length
      ? messages.resultPosition(formatNumber(rows.length, 0, locale), formatNumber(result.total, 0, locale))
      : `${formatNumber(result.total, 0, locale)} ${result.total === 1 ? noun.one : noun.other}`;
  const [titleColumn, ...restColumns] = result.columns;
  return (
    <ResultFrame
      result={result}
      icon={<IconGrid />}
      meta={meta}
      copyText={toText(result)}
      csv={toCsv(result)}
      flush
      footer={
        result.total > rows.length ? (
          <Button
            variant="ghost"
            size="sm"
            icon={<IconPopOut />}
            onClick={() => handlers.openResultWindow(result)}
          >
            {messages.showAllInWindow(formatNumber(result.total, 0, locale), noun.other)} </Button>
        ) : undefined
      }
    >
      <TableScroll label={result.title} className="fa-ai-result-table">
        <table className="fa-ai-table">
          <thead>
            <tr>
              {result.columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  data-priority={column.priority ?? 3}
                  data-numeric={column.type === "number" ? "" : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {result.columns.map((column) => (
                  <td
                    key={column.key}
                    data-priority={column.priority ?? 3}
                    data-numeric={column.type === "number" ? "" : undefined}
                    data-muted={column.type === "time" ? "" : undefined}
                  >
                    <Cell column={column} value={row[column.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      {titleColumn ? (
        <ul className="fa-ai-result-rows" aria-label={result.title}>
          {rows.map((row, index) => {
            const status = restColumns.find(
              (column) => column.type === "status",
            );
            const metas = restColumns
              .filter((column) => column.type !== "status")
              .slice(0, 2);
            return (
              <li key={index} className="fa-ai-result-row">
                <span className="fa-ai-result-row-title">
                  <Cell column={titleColumn} value={row[titleColumn.key]} />
                </span>
                {status ? (
                  <Cell column={status} value={row[status.key]} />
                ) : null}
                <span className="fa-ai-result-row-meta">
                  {metas.map((column, metaIndex) => (
                    <span key={column.key}>
                      {metaIndex > 0 ? " · " : null}
                      <Cell column={column} value={row[column.key]} />
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </ResultFrame>
  );
}
