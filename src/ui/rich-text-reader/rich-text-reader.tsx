import { lazy, Suspense, type ComponentProps } from "react"
import { cx } from "../../lib/cx.js"
import { useMessages } from "../../lib/i18n/index.js"
import { ScrollArea } from "../scroll-area/index.js"
import { richTextReaderMessages } from "./messages.js"

const MarkdownDocument = /* @__PURE__ */ lazy(() => import("../../ai/markdown/markdown.js").then((module) => ({ default: module.MarkdownDocument })))

export interface RichTextReaderProps extends Omit<ComponentProps<"div">, "children"> {
  /** The document as Markdown (GFM): the same string RichTextInput edits. Raw HTML is ignored and the tree is sanitised. */
  value: string
  /** Longest height in CSS pixels, past which the document scrolls in a focusable region. Default none: the document takes the height it needs and whatever holds it scrolls. */
  maxHeight?: number
  /** Give headings GitHub-style ids and make `#fragment` links and footnotes jump within the page. Set false when several readers share a page and their ids would repeat. Default true. */
  anchors?: boolean
  /** Draw images. False shows their alternative text, so a document from an untrusted author loads nothing from an address it chose. Default true. */
  images?: boolean
}

/**
 * A Markdown document to read: no toolbar, no well and no editor. Tables, task lists, code,
 * footnotes and images draw fully, which the editor's visual view does not do for tables. Links
 * follow the editor's address rules and open in a new tab; anything unsafe keeps its text and
 * loses its address. The renderer loads when this component first renders, and until then the
 * plain text holds the place.
 */
export function RichTextReader({ value, maxHeight, anchors = true, images = true, className, style, "aria-label": label, "aria-labelledby": labelledBy, ...rest }: RichTextReaderProps) {
  const messages = useMessages(richTextReaderMessages)
  const scrolls = maxHeight !== undefined
  const content = (
    <Suspense fallback={<p className="fa-rich-text-reader-plain">{value}</p>}>
      <MarkdownDocument text={value} anchors={anchors} images={images} />
    </Suspense>
  )
  return (
    <div
      {...rest}
      className={cx("fa-rich-text-reader", className)}
      role={!scrolls && (label || labelledBy) ? "region" : rest.role}
      aria-label={scrolls ? undefined : label}
      aria-labelledby={scrolls ? undefined : labelledBy}
      data-scrolls={scrolls ? "" : undefined}
      style={scrolls ? { ...style, ["--_reader-max" as string]: `${Math.max(40, maxHeight)}px` } : style}
    >
      {scrolls ? (
        // A focusable region needs a name; the document is the only thing it can be called.
        <ScrollArea aria-label={label ?? (labelledBy ? undefined : messages.document)} aria-labelledby={labelledBy}>
          {content}
        </ScrollArea>
      ) : (
        content
      )}
    </div>
  )
}
