import { useMessages } from "../../lib/i18n/index.js"
import { richTextMessages } from "./messages.js"
import {
  lazy,
  Suspense,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cx } from "../../lib/cx.js";
import {
  IconChevronDown,
  IconCode,
  IconItalic,
} from "../../icons/generated/icons.js";
import { Button } from "../button/index.js";
import { Field } from "../field/index.js";
import { useBoundField, useTextValue, type FieldChrome } from "../form/context.js";
import { Skeleton } from "../skeleton/index.js";
import { Segmented } from "../segmented/index.js";
import { richTextViews } from "./view-options.js";
import { BlockStyleLabel } from "./block-style.js";

const Editor = /* @__PURE__ */ lazy(() => import("./rich-text-editor.js"));

/** The rendered editor or the Markdown source of the same document. */
export type RichTextView = "visual" | "markdown";

/** A file uploaded by the host. Only its Markdown URL and label enter the document. */
export interface RichTextAttachment {
  /** Images render inline; other files become ordinary Markdown links. */
  kind: "image" | "link";
  /** HTTP(S) or relative URL. Link attachments also accept mailto: and tel:. */
  url: string;
  /** Image alternative text or the file link's visible text. */
  label: string;
}

/** A block a slash command can turn the current one into. */
export type RichTextBlock = "paragraph" | "h1" | "h2" | "h3" | "quote" | "code" | "bullet" | "number" | "check";

/** One row of the mention list. */
export interface RichTextMention {
  /** Stable identifier. */
  id: string;
  /** The name shown in the list. */
  label: string;
  /** Second line. */
  description?: string;
  /** Leading icon. Pass it without a size. */
  icon?: ReactNode;
  /** Trailing data. */
  meta?: string;
  /** The text placed in the document. Default "@" and the label. */
  insert?: string;
  /** Makes the mention a Markdown link. The address passes the editor's link check, or the text goes in unlinked. */
  href?: string;
}

/** The mention list: opens on @ after a space or at the start of a line. */
export interface RichTextMentions {
  /** The rows for what has been typed after the @, at once or as a promise. The host does the matching; `signal` aborts when a newer query replaces this one. */
  search: (
    query: string,
    options: { signal: AbortSignal },
  ) => readonly RichTextMention[] | Promise<readonly RichTextMention[]>;
  /** Accessible name of the list. Default "Mentions". */
  label?: string;
  /** The highlighted row's detail, beside the list. */
  renderDetail?: (mention: RichTextMention) => ReactNode;
  /** Rows of height to hold while results load, so the popup keeps its size and place. */
  reserveRows?: number;
}

/** One row of the slash menu. */
export interface RichTextCommand {
  /** Stable identifier. */
  id: string;
  /** The name shown in the list and matched against what is typed. */
  label: string;
  /** Second line. */
  description?: string;
  /** Leading icon. Pass it without a size. */
  icon?: ReactNode;
  /** Plain text that replaces the typed command. Default: the command is removed. */
  insert?: string;
  /** Turn the block holding the caret into this one. */
  block?: RichTextBlock;
  /** Called after the typed command has gone, for an action of the host's own. */
  onSelect?: () => void;
}

export interface RichTextInputProps {
  /** Controlled Markdown source. HTML and editor JSON are never emitted. */
  value?: string;
  /** Initial Markdown when the host does not control value. Default empty. */
  defaultValue?: string;
  /** The next Markdown after an edit. View changes do not rewrite the document. */
  onValueChange?: (markdown: string) => void;
  /** Controlled presentation. Default visual; the visual view is directly editable. */
  view?: RichTextView;
  /** Initial presentation for an uncontrolled view. Default visual. */
  defaultView?: RichTextView;
  /** Called when a person chooses Visual or Markdown. */
  onViewChange?: (view: RichTextView) => void;
  /** Offer the Markdown source view. Labels become named Eye/Code icons before formatting wraps. Default true. */
  sourceView?: boolean;
  /** Prompt shown in an empty document. Default "Write a document…". */
  placeholder?: string;
  /** Prevent edits while allowing selection, source inspection and normal safe-link opening in a new tab. */
  readOnly?: boolean;
  /** Disable editing, link activation, toolbar controls and source switching. */
  disabled?: boolean;
  /** Mark a bare input invalid; RichTextField derives this from validation. */
  invalid?: boolean;
  /** Announce that the document is required. Validate with richTextSchema. */
  required?: boolean;
  /** Native form field name; its value is Markdown. */
  name?: string;
  /** ID of the active editing surface. Field supplies a label when wrapped. */
  id?: string;
  /** Receives the visible editing surface for focus. */
  ref?: Ref<HTMLDivElement | HTMLTextAreaElement>;
  /** Called when focus leaves the complete editor, including its toolbar. */
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  /** Accessible name for a bare input. */
  "aria-label"?: string;
  /** IDs providing the accessible name. */
  "aria-labelledby"?: string;
  /** IDs of supporting or validation text. */
  "aria-describedby"?: string;
  /** Minimum content height, in CSS pixels. Default 160. Toolbar height is additional. */
  minHeight?: number;
  /** Maximum content height, in CSS pixels; longer documents scroll. Default 480. */
  maxHeight?: number;
  /** Allow vertical resizing of the editing surface between its limits. Default true. */
  resize?: boolean;
  /** Enable browser spelling checks. Default true. */
  spellCheck?: boolean;
  /** Host-owned upload adapter. When supplied, the toolbar offers Attach file. */
  uploadAttachment?: (file: File) => Promise<RichTextAttachment>;
  /** File picker accept attribute used by the upload adapter. Default unrestricted. */
  attachmentAccept?: string;
  /**
   * Reports an upload failure to the host instead of the default toast. The Attach button
   * shows the failure in place, its tooltip carries the message and a status region
   * announces it.
   */
  onAttachmentError?: (error: unknown) => void;
  /** Offer an @ mention list in the visual view. Off by default. */
  mentions?: RichTextMentions;
  /** Offer a / menu at the start of a block in the visual view: `true` for the block styles and lists, or your own rows. Off by default. */
  slashCommands?: boolean | readonly RichTextCommand[];
  /** Receives an editing-engine error; the original Markdown remains available in source view. */
  onError?: (error: Error) => void;
  /** Outer layout classes. */
  className?: string;
  /** Outer layout styles. */
  style?: CSSProperties;
}

/**
 * A Markdown document with an editable visual view and optional source view. The toolbar
 * uses Glass UX Button, Segmented, Menu and Popover controls. Supports paragraphs,
 * headings, quotes, fenced code, bold, italic, inline code, strike-through, lists,
 * task lists, links and inline images. Choose Quote from Block style for Markdown blockquotes.
 * Plain link clicks place the editing caret; Ctrl/⌘-click, middle-click or the link popover's
 * Open link action opens a safe destination separately. Read-only links open on a normal click.
 * HTTP(S), mailto:, tel: and relative destinations are syntax checked; applications own
 * allowed-domain and other business policies. Unsupported syntax remains available in source.
 * The editing engine loads only when this component renders.
 */
export function RichTextInput({
  value,
  defaultValue = "",
  onValueChange,
  minHeight = 160,
  maxHeight = 480,
  className,
  style,
  ...props
}: RichTextInputProps) {
  const [inner, setInner] = useState(defaultValue);
  const markdown = value ?? inner;
  const bounds = {
    minHeight: Math.max(40, minHeight),
    maxHeight: Math.max(40, minHeight, maxHeight),
  };
  const change = (next: string) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };
  return (
    <Suspense
      fallback={
        <RichTextSkeleton {...bounds} className={className} style={style} />
      }
    >
      <Editor
        {...props}
        {...bounds}
        className={className}
        style={style}
        value={markdown}
        onValueChange={change}
      />
    </Suspense>
  );
}

export interface RichTextSkeletonProps {
  /** Same content height as RichTextInput. Default 160 CSS pixels. */
  minHeight?: number;
  /** Same content bound as RichTextInput. Default 480 CSS pixels. */
  maxHeight?: number;
  /** Outer layout classes. */
  className?: string;
  /** Outer layout styles, matching the loaded input's layout. */
  style?: CSSProperties;
}

/** The editor's adaptive toolbar and empty content geometry while the engine or document loads. */
export function RichTextSkeleton({
  minHeight = 160,
  maxHeight = 480,
  className,
  style,
}: RichTextSkeletonProps) {
  const messages = useMessages(richTextMessages)

  return (
    <div
      className={cx("fa-control fa-rich-text", className)}
      data-loading=""
      aria-busy="true"
      style={style}
    >
      <div className="fa-rich-text-toolbar" aria-hidden="true" inert>
        <div className="fa-rich-text-formatting">
          <div className="fa-rich-text-skeleton-action">
            <Button
              variant="ghost"
              size="sm"
              className="fa-rich-text-block"
              iconEnd={<IconChevronDown />}
              disabled
              tooltip={false}
              tabIndex={-1}
            >
              <BlockStyleLabel value="paragraph" />
            </Button>
            <Skeleton.Block height="100%" width="100%" />
          </div>
          {[
            <strong key="bold">{messages.b}</strong>,
            null,
            null,
            <s key="strike">{messages.s}</s>,
            null,
            "1.",
            null,
            null,
            null,
            null,
          ].map((label, index) => (
            <div className="fa-rich-text-skeleton-action" key={index}>
              <Button
                variant="ghost"
                size="sm"
                icon={
                  label ? undefined : index === 1 ? (
                    <IconItalic />
                  ) : (
                    <IconCode />
                  )
                }
                aria-label={messages.loadingFormatting}
                disabled
                tooltip={false}
                tabIndex={-1}
              >
                {label}
              </Button>
              <Skeleton.Block height="100%" width="100%" />
            </div>
          ))}
        </div>
        <div className="fa-rich-text-modes-slot">
          <Segmented
            className="fa-rich-text-skeleton-modes fa-skel"
            size="sm"
            options={richTextViews(messages)}
            value="visual"
            disabled
            aria-label={messages.loadingDocumentView}
          />
        </div>
      </div>
      <Skeleton.Block
        height={Math.min(Math.max(40, minHeight), Math.max(40, maxHeight))}
        width="100%"
      />
    </div>
  );
}

export interface RichTextFieldProps
  extends
    FieldChrome,
    Omit<
      RichTextInputProps,
      | "value"
      | "defaultValue"
      | "onValueChange"
      | "name"
      | "onBlur"
      | "invalid"
      | "required"
      | "disabled"
      | "className"
    > {}

/** Markdown input bound to a string form field, with Field label and reserved validation. */
export function RichTextField({
  label,
  hint,
  warning,
  optional,
  required,
  aside,
  className,
  disabled,
  ...control
}: RichTextFieldProps) {
  const { field, error, root } = useBoundField<string>();
  const text = useTextValue(field);
  return (
    <Field
      {...root}
      label={label}
      hint={hint}
      warning={warning}
      optional={optional}
      required={required}
      aside={aside}
      className={className}
      disabled={disabled}
      nativeLabel={false}
    >
      <RichTextInput
        {...control}
        name={field.name}
        value={text.value}
        onValueChange={text.onValueChange}
        onBlur={field.handleBlur}
        required={required}
        disabled={disabled}
        invalid={Boolean(error)}
      />
    </Field>
  );
}
