import { memo, type ComponentProps, type ReactNode } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import { IconCheck, IconExternalLink, IconImage } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { CodeBlock, InlineCode } from "../code-block/index.js"
import { EntityChip, useEntityResolver } from "../entity-chip/index.js"
import { parseEntityHref, safeExternalHref } from "../entities.js"
import { CitationMarker } from "../sources/index.js"
import { looksNumeric, TableScroll } from "../table/index.js"
import type { EntityRef } from "../types.js"

/* ── hast helpers (local types: the tree is plain data) ───────────────────── */

interface HastText {
  /** Semantic content or control type. */
  type: "text"
  value: string
}
interface HastElement {
  /** Semantic content or control type. */
  type: "element"
  tagName: string
  properties?: Record<string, unknown>
  children: HastNode[]
}
type HastNode = HastText | HastElement | { type: string; children?: HastNode[] }

function textOf(node: HastNode | undefined): string {
  if (!node) return ""
  if (node.type === "text") return (node as HastText).value
  return ((node as HastElement).children ?? []).map(textOf).join("")
}

/**
 * Streaming: put the caret right after the last character of the answer so far, inside
 * whatever block that character is in. Earlier lines never reflow; only the last line grows.
 */
function rehypeCaret() {
  return (tree: HastNode) => {
    let parent: HastElement | null = null
    let index = -1
    const walk = (node: HastNode) => {
      const children = (node as HastElement).children
      if (!children) return
      children.forEach((child, childIndex) => {
        if (child.type === "text" && (child as HastText).value.trim()) {
          parent = node as HastElement
          index = childIndex
        }
        if ((child as HastElement).tagName !== "pre") walk(child)
      })
    }
    walk(tree)
    const caret: HastElement = { type: "element", tagName: "span", properties: { className: ["fa-ai-caret"], ariaHidden: "true" }, children: [] }
    if (parent) (parent as HastElement).children.splice(index + 1, 0, caret)
    else ((tree as HastElement).children ??= []).push(caret)
  }
}

/** `[^2]` markers (citations without definitions) become `#cite-2` links we render as pills. */
function prepare(text: string) {
  return text.replace(/\[\^(\d{1,3})\](?!:)/g, "[$1](#cite-$1)")
}

/* ── Renderers ────────────────────────────────────────────────────────────── */

function MarkdownLink({ href, children }: { href?: string; children?: ReactNode }) {
  const resolver = useEntityResolver()
  const cite = href?.match(/^#cite-(\d{1,3})$/)
  if (cite) return <CitationMarker index={Number(cite[1])} />
  const entity = parseEntityHref(resolver.kinds, href)
  if (entity) {
    const label = typeof children === "string" ? children : Array.isArray(children) ? children.join("") : entity.id
    const ref: EntityRef = { ...entity, label }
    return <EntityChip entity={ref} />
  }
  const external = safeExternalHref(href)
  if (external) {
    return (
      <a className="fa-ai-link" href={external} target="_blank" rel="noopener noreferrer">
        {children}
        <IconExternalLink className="fa-ai-link-external" label="(opens in a new tab)" />
      </a>
    )
  }
  return <span className="fa-ai-link-dead">{children}</span>
}

function alignOf(style: unknown) {
  const align = (style as { textAlign?: string } | undefined)?.textAlign
  return align === "right" ? "end" : align === "center" ? "center" : undefined
}

const components: Components = {
  // Headings carry a class so the spacing around them is class-keyed (markdown.css).
  h1: ({ children }) => <h1 className="fa-ai-md-heading">{children}</h1>,
  h2: ({ children }) => <h2 className="fa-ai-md-heading">{children}</h2>,
  h3: ({ children }) => <h3 className="fa-ai-md-heading">{children}</h3>,
  h4: ({ children }) => <h4 className="fa-ai-md-heading">{children}</h4>,
  h5: ({ children }) => <h5 className="fa-ai-md-heading">{children}</h5>,
  h6: ({ children }) => <h6 className="fa-ai-md-heading">{children}</h6>,
  a: ({ href, children }) => <MarkdownLink href={href}>{children}</MarkdownLink>,
  pre: ({ node }) => {
    const code = (node?.children?.[0] ?? undefined) as HastElement | undefined
    const className = (code?.properties?.className as string[] | undefined)?.find((name) => name.startsWith("language-"))
    return <CodeBlock code={textOf(code)} language={className?.slice("language-".length)} />
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
    <th data-align={alignOf(style)} data-numeric={node && looksNumeric(textOf(node)) ? "" : undefined}>
      {children}
    </th>
  ),
  td: ({ children, style, node }) => (
    <td data-align={alignOf(style)} data-numeric={node && looksNumeric(textOf(node)) ? "" : undefined} title={node ? textOf(node) : undefined}>
      {children}
    </td>
  ),
  input: ({ checked }) => (
    <span className="fa-ai-task" data-checked={checked ? "" : undefined} role="img" aria-label={checked ? "Done" : "Not done"}>
      {checked ? <IconCheck /> : null}
    </span>
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
}

export interface MarkdownProps extends Omit<ComponentProps<"div">, "children"> {
  /** Assistant markdown (GFM). Raw HTML is ignored and the tree is sanitised. */
  text: string
  /** Show the caret after the last character while the answer streams in. */
  streaming?: boolean
}

/**
 * Assistant prose. GFM markdown, sanitised, with Glass UX semantics: internal links to
 * entities become context chips, external links say they leave Glass UX, `[^n]` markers become
 * citation pills, fenced code becomes a CodeBlock and tables take the AI table style.
 * Prose holds the reading measure (in a conversation, the reading column); code and tables
 * are wide blocks that break out wider than the text.
 */
export const Markdown = memo(function Markdown({ text, streaming = false, className, ...rest }: MarkdownProps) {
  return (
    <div {...rest} className={cx("fa-ai-md", className)} data-streaming={streaming ? "" : undefined}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={streaming ? [rehypeSanitize, rehypeCaret as never] : [rehypeSanitize]}
        components={components}
        skipHtml
      >
        {prepare(text)}
      </ReactMarkdown>
    </div>
  )
})
