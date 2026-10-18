import { Fragment, memo, useMemo, type ComponentProps, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { IconExternalLink, IconImage } from "../../icons/generated/icons.js";
import { cx } from "../../lib/cx.js";
import { Checkbox } from "../../ui/checkbox/index.js";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { CodeBlock, InlineCode } from "../code-block/index.js";
import { parseEntityHref, safeExternalHref } from "../entities.js";
import { EntityChip, useEntityResolver } from "../entity-chip/index.js";
import { CitationMarker } from "../sources/index.js";
import { looksNumeric, TableScroll } from "../table/index.js";
import type { EntityRef } from "../types.js";

/* ── hast helpers (local types: the tree is plain data) ───────────────────── */

interface HastText {
  /** Semantic content or control type. */
  type: "text";
  value: string;
}
interface HastElement {
  /** Semantic content or control type. */
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children: HastNode[];
}
type HastNode =
  HastText | HastElement | { type: string; children?: HastNode[] };

function textOf(node: HastNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return (node as HastText).value;
  return ((node as HastElement).children ?? []).map(textOf).join("");
}

/**
 * Streaming: put the caret right after the last character of the answer so far, inside
 * whatever block that character is in. Earlier lines never reflow; only the last line grows.
 */
function rehypeCaret() {
  return (tree: HastNode) => {
    let parent: HastElement | null = null;
    let index = -1;
    const walk = (node: HastNode) => {
      const children = (node as HastElement).children;
      if (!children) return;
      children.forEach((child, childIndex) => {
        if (child.type === "text" && (child as HastText).value.trim()) {
          parent = node as HastElement;
          index = childIndex;
        }
        if ((child as HastElement).tagName !== "pre") walk(child);
      });
    };
    walk(tree);
    const caret: HastElement = {
      type: "element",
      tagName: "span",
      properties: { className: ["fa-ai-caret"], ariaHidden: "true" },
      children: [],
    };
    if (parent) (parent as HastElement).children.splice(index + 1, 0, caret);
    else ((tree as HastElement).children ??= []).push(caret);
  };
}

/** `[^2]` markers (citations without definitions) become `#cite-2` links we render as pills. */
function prepare(text: string) {
  return text.replace(/\[\^(\d{1,3})\](?!:)/g, "[$1](#cite-$1)");
}

/* ── Renderers ────────────────────────────────────────────────────────────── */

function MarkdownLink({
  href,
  children,
}: {
  href?: string;
  children?: ReactNode;
}) {
  const resolver = useEntityResolver();
  const cite = href?.match(/^#cite-(\d{1,3})$/);
  if (cite) return <CitationMarker index={Number(cite[1])} />;
  const entity = parseEntityHref(resolver.kinds, href);
  if (entity) {
    const label =
      typeof children === "string"
        ? children
        : Array.isArray(children)
          ? children.join("")
          : entity.id;
    const ref: EntityRef = { ...entity, label };
    return <EntityChip entity={ref} />;
  }
  const external = safeExternalHref(href);
  if (external) {
    return (
      <a
        className="fa-ai-link"
        href={external}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
        <IconExternalLink
          className="fa-ai-link-external"
          label="(opens in a new tab)"
        />
      </a>
    );
  }
  return <span className="fa-ai-link-dead">{children}</span>;
}

function alignOf(style: unknown) {
  const align = (style as { textAlign?: string } | undefined)?.textAlign;
  return align === "right" ? "end" : align === "center" ? "center" : undefined;
}

const components: Components = {
  // Headings carry a class so the spacing around them is class-keyed (markdown.css).
  h1: ({ children }) => <h1 className="fa-ai-md-heading">{children}</h1>,
  h2: ({ children }) => <h2 className="fa-ai-md-heading">{children}</h2>,
  h3: ({ children }) => <h3 className="fa-ai-md-heading">{children}</h3>,
  h4: ({ children }) => <h4 className="fa-ai-md-heading">{children}</h4>,
  h5: ({ children }) => <h5 className="fa-ai-md-heading">{children}</h5>,
  h6: ({ children }) => <h6 className="fa-ai-md-heading">{children}</h6>,
  a: ({ href, children }) => (
    <MarkdownLink href={href}>{children}</MarkdownLink>
  ),
  pre: ({ node }) => {
    const code = (node?.children?.[0] ?? undefined) as HastElement | undefined;
    const className = (
      code?.properties?.className as string[] | undefined
    )?.find((name) => name.startsWith("language-"));
    return (
      <CodeBlock
        code={textOf(code)}
        language={className?.slice("language-".length)}
      />
    );
  },
  code: ({ children }) => <InlineCode>{String(children ?? "")}</InlineCode>,
  table: ({ children }) => (
    <div className="fa-ai-md-table" data-breakout="">
      <TableScroll label="Table" maxRows={14}>
        <table className="fa-ai-table">{children}</table>
      </TableScroll>
    </div>
  ),
  th: ({ children, style, node }) => (
    <th
      data-align={alignOf(style)}
      data-numeric={node && looksNumeric(textOf(node)) ? "" : undefined}
    >
      {children}
    </th>
  ),
  td: ({ children, style, node }) => (
    <td
      data-align={alignOf(style)}
      data-numeric={node && looksNumeric(textOf(node)) ? "" : undefined}
    >
      <TruncatedText text={node ? textOf(node) : undefined}>
        {children}
      </TruncatedText>
    </td>
  ),
  input: ({ checked }) => (
    <Checkbox
      checked={Boolean(checked)}
      readOnly
      aria-label={checked ? "Done" : "Not done"}
    />
  ),
  hr: () => (
    <p className="fa-ai-md-break" aria-hidden>
      · · ·
    </p>
  ),
  img: ({ alt }) => (
    <span className="fa-ai-md-image">
      <IconImage />
      {alt || "Image"}
    </span>
  ),
};

/** Document tables retain complete text within fixed column widths. */
const wrappingComponents: Components = {
  ...components,
  td: ({ children, style, node }) => (
    <td
      data-align={alignOf(style)}
      data-numeric={node && looksNumeric(textOf(node)) ? "" : undefined}
    >
      {children}
    </td>
  ),
};

export interface MarkdownProps extends Omit<ComponentProps<"div">, "children"> {
  /** Assistant markdown (GFM). Raw HTML is ignored and the tree is sanitised. */
  text: string;
  /** Show the caret after the last character while the answer streams in. */
  streaming?: boolean;
  /** Wrap table text within the available column widths. Default false uses single-line cells with truncation tooltips; use true for readable documents. */
  wrapTableCells?: boolean;
}

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeSanitize];
const streamingRehypePlugins = [rehypeSanitize, rehypeCaret as never];

/** One independently parsed run of top-level blocks; unchanged runs skip re-parsing. */
const MarkdownSegment = memo(function MarkdownSegment({
  text,
  caret,
  wrapTableCells,
}: {
  text: string;
  caret: boolean;
  wrapTableCells: boolean;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={caret ? streamingRehypePlugins : rehypePlugins}
      components={wrapTableCells ? wrappingComponents : components}
      skipHtml
    >
      {prepare(text)}
    </ReactMarkdown>
  );
});

/**
 * Constructs whose meaning can span a blank line or depend on the whole document: link
 * reference and footnote definitions, and HTML blocks that end only at their closing
 * marker. Text containing any of them is parsed as one document.
 */
const UNSPLITTABLE = /^ {0,3}\[[^\]\n]+\]:|<(?:!|\?|pre[\s>]|script[\s>]|style[\s>]|textarea[\s>])/im;
/** A line that would continue a list or an indented block after a blank line. */
const CONTINUES = /^(?:\s|[-+*](?:[ \t]|$)|\d{1,9}[.)](?:[ \t]|$))/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Split markdown at blank lines that end every open block, so each piece parses exactly
 * as it would within the whole document: outside fenced code, and only where the next line
 * starts at the margin with something other than a list marker. Splitting is skipped for
 * text with document-wide constructs.
 */
export function splitMarkdownBlocks(text: string): string[] {
  if (UNSPLITTABLE.test(text)) return [text];
  const lines = text.split("\n");
  const segments: string[] = [];
  let start = 0;
  let fence: string | null = null;
  let blank = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (fence) {
      const close = line.match(FENCE);
      if (
        close &&
        close[1]![0] === fence[0] &&
        close[1]!.length >= fence.length &&
        !line.slice(close[0].length).trim()
      )
        fence = null;
      continue;
    }
    if (!line.trim()) {
      blank = true;
      continue;
    }
    if (blank && index > start && !CONTINUES.test(line)) {
      let end = index;
      while (end > start && !lines[end - 1]!.trim()) end -= 1;
      if (end > start) {
        segments.push(lines.slice(start, end).join("\n"));
        start = index;
      }
    }
    blank = false;
    const open = line.match(FENCE);
    if (open && !(open[1]![0] === "`" && line.slice(open[0].length).includes("`")))
      fence = open[1]!;
  }
  segments.push(lines.slice(start).join("\n"));
  return segments;
}

/**
 * Whether the streaming caret can attach to text in this piece: it holds characters
 * outside code fences, images, empty links, tags, thematic breaks and bare block markers.
 */
function hasCaretText(segment: string) {
  let inFence: string | null = null;
  for (const raw of segment.split("\n")) {
    const fence = raw.match(FENCE);
    if (inFence) {
      if (fence && fence[1]![0] === inFence[0] && fence[1]!.length >= inFence.length)
        inFence = null;
      continue;
    }
    if (fence) {
      inFence = fence[1]!;
      continue;
    }
    if (/^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(raw)) continue;
    const line = raw
      .replace(/^(?:[ \t]*(?:>|[-+*](?=[ \t]|$)|\d{1,9}[.)](?=[ \t]|$)))+/, "")
      .replace(/^[ \t]*#{1,6}(?=[ \t]|$)/, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[\]\([^)]*\)/g, "")
      .replace(/<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^>]*)?\/?>/g, "");
    if (line.trim()) return true;
  }
  return false;
}

/**
 * Assistant prose. GFM markdown, sanitised, with Glass UX semantics: internal links to
 * entities become context chips, external links say they leave Glass UX, `[^n]` markers become
 * citation pills, fenced code becomes a CodeBlock and tables take the AI table style.
 * Prose holds the reading measure (in a conversation, the reading column); code and tables
 * are wide blocks that break out wider than the text.
 */
export const Markdown = memo(function Markdown({
  text,
  streaming = false,
  wrapTableCells = false,
  className,
  ...rest
}: MarkdownProps) {
  // Completed blocks keep their text while an answer streams, so only the growing tail
  // (and the block holding the caret) parses again on each update.
  const segments = useMemo(() => splitMarkdownBlocks(text), [text]);
  const caretIndex = useMemo(() => {
    if (!streaming) return -1;
    // The caret follows the last text outside code, as it would in one parse; with no such
    // text it goes at the very end.
    for (let index = segments.length - 1; index >= 0; index -= 1)
      if (hasCaretText(segments[index]!)) return index;
    return segments.length - 1;
  }, [segments, streaming]);
  return (
    <div
      {...rest}
      className={cx("fa-ai-md", className)}
      data-streaming={streaming ? "" : undefined}
      data-wrap-table-cells={wrapTableCells ? "" : undefined}
    >
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {/* The newline a single parse places between top-level blocks. */}
          {index > 0 ? "\n" : null}
          <MarkdownSegment
            text={segment}
            caret={index === caretIndex}
            wrapTableCells={wrapTableCells}
          />
        </Fragment>
      ))}
    </div>
  );
});
