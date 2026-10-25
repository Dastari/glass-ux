import { readingKey } from "../../lib/direction.js"
import { useRef, useState } from "react";
import { IconChevronRight } from "../../icons/generated/icons.js";
import { cx } from "../../lib/cx.js";
import { Button } from "../../ui/button/index.js";
import { Tooltip } from "../../ui/tooltip/index.js";
import { formatNumber } from "../format.js";
import { useLocale } from "../../lib/locale/use-locale.js";

/** Children shown per object or array before "Show n more". */
const PAGE = 40;
/** Depth that opens by default. */
const OPEN_DEPTH = 1;
/** Strings longer than this are cut with "…" and the full value in a tooltip. */
const STRING_MAX = 160;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function kindOf(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as "object" | "string" | "number" | "boolean";
}

function Scalar({ value }: { value: unknown }) {
  const kind = kindOf(value);
  if (kind === "string") {
    const text = value as string;
    const cut = text.length > STRING_MAX;
    return (
      <span className="fa-ai-json-value" data-type="string">
        {JSON.stringify(cut ? `${text.slice(0, STRING_MAX)}…` : text)}
      </span>
    );
  }
  return (
    <span className="fa-ai-json-value" data-type={kind}>
      {kind === "null" ? "null" : String(value)}
    </span>
  );
}

function summary(value: Json[] | Record<string, Json>, locale: string) {
  if (Array.isArray(value))
    return `${formatNumber(value.length, 0, locale)} ${value.length === 1 ? "item" : "items"}`;
  const keys = Object.keys(value).length;
  return `${formatNumber(keys, 0, locale)} ${keys === 1 ? "key" : "keys"}`;
}

function Node({
  name,
  value,
  depth,
}: {
  name?: string | number;
  value: unknown;
  depth: number;
}) {
  const kind = kindOf(value);
  const branch = kind === "array" || kind === "object";
  const [open, setOpen] = useState(depth < OPEN_DEPTH);
  const [shown, setShown] = useState(PAGE);
  const locale = useLocale();
  const rowRef = useRef<HTMLLIElement>(null);
  const accessibleName = `${name !== undefined ? `${name}: ` : ""}${branch ? `${kind}, ${summary(value as Json[] | Record<string, Json>, locale)}` : String(value)}`;

  const key =
    name !== undefined ? (
      <span className="fa-ai-json-key">
        {name}
        <span className="fa-ai-json-colon">:</span>
      </span>
    ) : null;

  if (!branch) {
    return (
      <Tooltip
        content={typeof value === "string" ? value : ""}
        enabled={typeof value === "string" && value.length > STRING_MAX}
      >
        <li
          className="fa-ai-json-row"
          role="treeitem"
          tabIndex={depth === 0 ? 0 : -1}
          aria-label={accessibleName}
        >
          <span className="fa-ai-json-spacer" />
          {key}
          <Scalar value={value} />
        </li>
      </Tooltip>
    );
  }

  const entries =
    kind === "array"
      ? (value as Json[]).map((item, index) => [index, item] as const)
      : Object.entries(value as Record<string, Json>);
  const brackets = kind === "array" ? ["[", "]"] : ["{", "}"];
  return (
    <li
      ref={rowRef}
      className="fa-ai-json-row"
      role="treeitem"
      tabIndex={depth === 0 ? 0 : -1}
      aria-label={accessibleName}
      aria-expanded={open}
    >
      <Button
        variant="ghost"
        size="xs"
        className="fa-ai-json-toggle"
        tabIndex={-1}
        tooltip={false}
        aria-label={`${open ? "Collapse" : "Expand"} ${name ?? "root"}`}
        onClick={() => {
          rowRef.current?.focus();
          setOpen((current) => !current);
        }}
      >
        <IconChevronRight data-open={open ? "" : undefined} />
      </Button>
      {key}
      <span className="fa-ai-json-punct">{brackets[0]}</span>
      {open ? null : (
        <>
          <span className="fa-ai-json-summary">
            {summary(value as Json[] | Record<string, Json>, locale)}
          </span>
          <span className="fa-ai-json-punct">{brackets[1]}</span>
        </>
      )}
      {open ? (
        <>
          <ul className="fa-ai-json-children" role="group">
            {entries.slice(0, shown).map(([childKey, child]) => (
              <Node
                key={childKey}
                name={childKey}
                value={child}
                depth={depth + 1}
              />
            ))}
            {entries.length > shown ? (
              <li
                className="fa-ai-json-row"
                role="treeitem"
                tabIndex={-1}
                aria-label={`Show more of ${name ?? "root"}`}
              >
                <span className="fa-ai-json-spacer" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="fa-ai-json-more"
                  tabIndex={-1}
                  onClick={() => {
                    rowRef.current?.focus();
                    setShown((count) => count + PAGE * 5);
                  }}
                >
                  Show{" "}
                  {formatNumber(Math.min(entries.length - shown, PAGE * 5), 0, locale)}{" "}
                  more of {formatNumber(entries.length, 0, locale)}
                </Button>
              </li>
            ) : null}
          </ul>
          <span className="fa-ai-json-close">
            <span className="fa-ai-json-punct">{brackets[1]}</span>
          </span>
        </>
      ) : null}
    </li>
  );
}

export interface JsonTreeProps {
  value: unknown;
  /** Accessible name: "Arguments", "Result". */
  label: string;
  /** The payload was cut by the server or the client; say so under the tree. */
  truncated?: string;
  className?: string;
}

/**
 * A read-only JSON viewer for tool arguments and results: collapsible objects and arrays,
 * typed values in the code colours, long arrays paged ("Show 200 more of 1,284") and long
 * strings cut with the full value on hover.
 */
export function JsonTree({
  value,
  label,
  truncated,
  className,
}: JsonTreeProps) {
  const typeahead = useRef({ text: "", at: 0 });
  return (
    <div className={cx("fa-ai-json", className)}>
      <ul
        className="fa-ai-json-root"
        role="tree"
        aria-label={label}
        onFocus={(event) => {
          const row = (event.target as HTMLElement).closest<HTMLElement>(
            "[role=treeitem]",
          );
          event.currentTarget
            .querySelectorAll<HTMLElement>("[role=treeitem]")
            .forEach((item) => {
              item.tabIndex = item === row ? 0 : -1;
            });
        }}
        onKeyDown={(event) => {
          const rows = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              "[role=treeitem]",
            ),
          ];
          const current = (event.target as HTMLElement).closest<HTMLElement>(
            "[role=treeitem]",
          );
          if (!current) return;
          const key = readingKey(event.key, event.currentTarget);
          const index = rows.indexOf(current);
          const focus = (row: HTMLElement | undefined | null) => {
            if (row) {
              event.preventDefault();
              row.focus();
            }
          };
          if (key === "ArrowDown")
            focus(rows[Math.min(rows.length - 1, index + 1)]);
          else if (key === "ArrowUp") focus(rows[Math.max(0, index - 1)]);
          else if (key === "Home") focus(rows[0]);
          else if (key === "End") focus(rows.at(-1));
          else if (key === "ArrowRight") {
            if (current.getAttribute("aria-expanded") === "false") {
              event.preventDefault();
              current
                .querySelector<HTMLButtonElement>(":scope > button")
                ?.click();
            } else
              focus(
                current.querySelector<HTMLElement>(
                  ":scope > [role=group] > [role=treeitem]",
                ),
              );
          } else if (key === "ArrowLeft") {
            if (current.getAttribute("aria-expanded") === "true") {
              event.preventDefault();
              current
                .querySelector<HTMLButtonElement>(":scope > button")
                ?.click();
            } else
              focus(
                current.parentElement?.closest<HTMLElement>("[role=treeitem]"),
              );
          } else if (key === "Enter" || event.key === " ") {
            const button =
              current.querySelector<HTMLButtonElement>(":scope > button");
            if (button) {
              event.preventDefault();
              button.click();
            }
          } else if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            const now = Date.now();
            typeahead.current.text =
              (now - typeahead.current.at < 500 ? typeahead.current.text : "") +
              event.key.toLowerCase();
            typeahead.current.at = now;
            focus(
              [...rows.slice(index + 1), ...rows.slice(0, index + 1)].find(
                (row) =>
                  row
                    .getAttribute("aria-label")
                    ?.toLowerCase()
                    .startsWith(typeahead.current.text),
              ),
            );
          }
        }}
      >
        <Node value={value} depth={0} />
      </ul>
      {truncated ? <p className="fa-ai-json-truncated">{truncated}</p> : null}
    </div>
  );
}
