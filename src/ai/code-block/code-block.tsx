import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import {
  IconChevronDown,
  IconChevronUp,
  IconCode,
  IconWrapText,
} from "../../icons/generated/icons.js";
import { cx } from "../../lib/cx.js";
import { Button } from "../../ui/button/index.js";
import { CopyButton } from "../../ui/copy-button/index.js";
import { AiCard } from "../card/index.js";
import {
  highlight,
  languageLabel,
  resolveLanguage,
  type CodeToken,
} from "./highlighter.js";

/** Lines shown before the block offers "Show all n lines". */
const COLLAPSED_LINES = 16;

export interface CodeBlockProps {
  /** Accessible name; distinguish blocks with the same visible title. */
  label?: string;
  /** Heading level in the surrounding document. Defaults to 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Source code displayed by the code block. */
  code: string;
  /** Fence language ("powershell", "ps1", "json"…). Unknown languages render plain. */
  language?: string;
  /** A title in place of the language label ("Clear-PrintQueue.ps1"). */
  title?: string;
  /** Shows line numbers beside the code. */
  lineNumbers?: boolean;
  /** Start wrapped (logs, long one-liners). The reader can toggle it. */
  wrap?: boolean;
  /** Lines before the block collapses; 0 never collapses. */
  maxLines?: number;
  className?: string;
}

/**
 * A fenced code block: language label, copy (✓ in place), wrap toggle and optional line
 * numbers. Long blocks show their first lines with "Show all n lines". Highlighting loads
 * lazily; until then the same text renders in the same monospace lines, so nothing moves
 * when the colours arrive.
 */
export function CodeBlock({
  code,
  language,
  title,
  label: accessibleLabel,
  headingLevel = 3,
  lineNumbers = false,
  wrap: initialWrap = false,
  maxLines = COLLAPSED_LINES,
  className,
}: CodeBlockProps) {
  const text = code.replace(/\n$/, "");
  const lines = useMemo(() => text.split("\n"), [text]);
  const [highlighted, setHighlighted] = useState<{
    key: string;
    tokens: CodeToken[][];
  } | null>(null);
  const key = `${language ?? ""}\u0000${text}`;
  const tokens = highlighted?.key === key ? highlighted.tokens : null;
  const [wrap, setWrap] = useState(initialWrap);
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const label = title ?? languageLabel(language);
  const collapsible = maxLines > 0 && lines.length > maxLines + 2;
  const collapsed = collapsible && !expanded;

  useEffect(() => {
    if (!resolveLanguage(language)) return;
    let active = true;
    highlight(text, language).then(
      (result) => {
        if (active && result)
          setHighlighted({
            key: `${language ?? ""}\u0000${text}`,
            tokens: result,
          });
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [text, language]);

  return (
    <AiCard.Root
      well
      breakout
      className={cx("fa-ai-code", className)}
      data-wrap={wrap ? "" : undefined}
      aria-label={accessibleLabel ?? `${label} code`}
    >
      <AiCard.Header
        icon={<IconCode />}
        title={label}
        level={headingLevel}
        meta={lines.length > 1 ? `${lines.length} lines` : undefined}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={<IconWrapText />}
              aria-label="Wrap lines"
              aria-pressed={wrap}
              data-pressed={wrap ? "" : undefined}
              onClick={() => setWrap((value) => !value)}
            />
            <CopyButton value={text} label="Copy code" />
          </>
        }
      />
      <div
        id={id}
        className="fa-ai-code-scroll"
        data-collapsed={collapsed ? "" : undefined}
        style={{ "--_lines": maxLines } as CSSProperties}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll region must be keyboard scrollable (R20.6)
        tabIndex={0}
        role="region"
        aria-label={`${accessibleLabel ?? `${label} code`} source`}
      >
        <pre
          className="fa-ai-code-pre"
          data-numbers={lineNumbers ? "" : undefined}
          data-highlighted={tokens ? "" : undefined}
        >
          <code>
            {lines.map((line, index) => (
              <span key={index} className="fa-ai-code-line">
                {tokens?.[index]
                  ? tokens[index].map((token, tokenIndex) => (
                      <span
                        key={tokenIndex}
                        style={token.color ? { color: token.color } : undefined}
                      >
                        {token.content}
                      </span>
                    ))
                  : line || "​"}
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      </div>
      {collapsible ? (
        <div className="fa-ai-code-more">
          <Button
            variant="ghost"
            size="sm"
            icon={expanded ? <IconChevronUp /> : <IconChevronDown />}
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Show fewer lines" : `Show all ${lines.length} lines`}
          </Button>
        </div>
      ) : null}
    </AiCard.Root>
  );
}

/** Inline code inside prose. */
export function InlineCode({ children }: { children: string }) {
  return <code className="fa-ai-inline-code">{children}</code>;
}
