import { Field as BaseField } from "@base-ui/react/field";
import { CodeNode } from "@lexical/code";
import { ListItemNode, ListNode } from "@lexical/list";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from "@lexical/markdown";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  ContentEditable,
  type ContentEditableProps,
} from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  $setSelection,
  CLEAR_HISTORY_COMMAND,
  SKIP_DOM_SELECTION_TAG,
} from "lexical";
import {
  useEffect,
  useCallback,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type Ref,
} from "react";
import { cx } from "../../lib/cx.js";
import { Segmented } from "../segmented/index.js";
import { Textarea } from "../textarea/index.js";
import { EditorToolbar } from "./editor-toolbar.js";
import { MarkdownImageNode } from "./image-node.js";
import { MARKDOWN_LINK_NODES } from "./link-node.js";
import { LinkActivation } from "./link-activation.js";
import { MARKDOWN_TRANSFORMERS } from "./markdown.js";
import type { RichTextInputProps, RichTextView } from "./rich-text.js";
import { isSafeRichTextUrl } from "./urls.js";
import { RICH_TEXT_VIEWS } from "./view-options.js";

const EXTERNAL_TAG = "glass-rich-text-source";
const THEME = {
  paragraph: "fa-rich-text-paragraph",
  quote: "fa-rich-text-quote",
  code: "fa-rich-text-code-block",
  list: {
    nested: { listitem: "fa-rich-text-list-nested" },
    listitemChecked: "fa-rich-text-check",
    listitemUnchecked: "fa-rich-text-check",
  },
  text: {
    bold: "fa-rich-text-bold",
    italic: "fa-rich-text-italic",
    code: "fa-rich-text-code",
    strikethrough: "fa-rich-text-strike",
  },
};

/** Keep Markdown ownership outside Lexical. Imports never trigger a value-change callback. */
function MarkdownState({
  value,
  onValueChange,
  editable,
}: {
  value: string;
  /** Called with the document as Markdown after each edit that changes it; not for updates applied from `value`. */
  onValueChange?: (value: string) => void;
  editable: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const lastSource = useRef(value);
  const canonical = useRef<string | null>(null);
  const callback = useRef(onValueChange);
  useEffect(() => {
    callback.current = onValueChange;
  }, [onValueChange]);
  useEffect(() => {
    canonical.current = editor
      .getEditorState()
      .read(() =>
        $convertToMarkdownString(MARKDOWN_TRANSFORMERS, undefined, false),
      );
    return editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves, tags }) => {
        if (!dirtyElements.size && !dirtyLeaves.size) return;
        const next = editorState.read(() =>
          $convertToMarkdownString(MARKDOWN_TRANSFORMERS, undefined, false),
        );
        if (tags.has(EXTERNAL_TAG)) {
          canonical.current = next;
          return;
        }
        if (canonical.current === next) return;
        canonical.current = next;
        lastSource.current = next;
        callback.current?.(next);
      },
    );
  }, [editor]);
  useEffect(() => {
    editor.setEditable(editable);
    if (value === lastSource.current) return;
    lastSource.current = value;
    editor.update(
      () => {
        $convertFromMarkdownString(
          value,
          MARKDOWN_TRANSFORMERS,
          undefined,
          false,
        );
        $setSelection(null);
      },
      { tag: [EXTERNAL_TAG, SKIP_DOM_SELECTION_TAG], discrete: true },
    );
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
  }, [editor, value, editable]);
  return null;
}

function assignRef<T>(ref: Ref<T> | undefined, element: T | null) {
  if (typeof ref === "function") ref(element);
  else if (ref) ref.current = element;
}

/** Keep the editor root connected when Field focus/validation or controlled values rerender. */
function VisualSurface({
  control,
  ref,
  ...props
}: Omit<ContentEditableProps, "ref" | "placeholder" | "aria-placeholder"> & {
  control: InputHTMLAttributes<HTMLInputElement> & {
    ref?: Ref<HTMLDivElement>;
  };
  ref?: Ref<HTMLDivElement | HTMLTextAreaElement>;
}) {
  const {
    value: _value,
    defaultValue: _default,
    name: _name,
    type: _type,
    onChange: _onChange,
    disabled: _disabled,
    required: _required,
    readOnly: _readonly,
    ref: fieldRef,
    ...attributes
  } = control;
  const connect = useCallback(
    (element: HTMLDivElement | null) => {
      assignRef(fieldRef, element);
      assignRef(ref, element);
    },
    [fieldRef, ref],
  );
  return (
    <ContentEditable
      {...(attributes as Omit<
        ContentEditableProps,
        "placeholder" | "aria-placeholder"
      >)}
      {...props}
      placeholder={null}
      ref={connect}
    />
  );
}

function EditorContent({
  value = "",
  view,
  ref,
  disabled,
  readOnly,
  required,
  invalid,
  name,
  id,
  placeholder,
  spellCheck,
  onValueChange,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
}: Pick<
  RichTextInputProps,
  | "value"
  | "ref"
  | "disabled"
  | "readOnly"
  | "required"
  | "invalid"
  | "name"
  | "id"
  | "placeholder"
  | "spellCheck"
  | "onValueChange"
  | "aria-label"
  | "aria-labelledby"
  | "aria-describedby"
> & { view: RichTextView }) {
  const aria = {
    ...(ariaLabel !== undefined ? { "aria-label": ariaLabel } : {}),
    ...(ariaLabelledBy !== undefined
      ? { "aria-labelledby": ariaLabelledBy }
      : {}),
    ...(ariaDescribedBy !== undefined
      ? { "aria-describedby": ariaDescribedBy }
      : {}),
  };
  return (
    <div className="fa-rich-text-content">
      <RichTextPlugin
        contentEditable={
          view === "visual" ? (
            <BaseField.Control
              id={id}
              name={name}
              value={value}
              disabled={disabled}
              readOnly={readOnly}
              required={required}
              aria-invalid={invalid || undefined}
              render={(props) => {
                return (
                  <VisualSurface
                    control={
                      props as InputHTMLAttributes<HTMLInputElement> & {
                        ref?: Ref<HTMLDivElement>;
                      }
                    }
                    {...aria}
                    ref={ref}
                    role="textbox"
                    aria-multiline="true"
                    aria-readonly={readOnly || undefined}
                    aria-required={required || undefined}
                    aria-disabled={disabled || undefined}
                    aria-invalid={invalid || props["aria-invalid"]}
                    spellCheck={spellCheck}
                    tabIndex={disabled ? -1 : 0}
                    className="fa-rich-text-editable"
                  />
                );
              }}
            />
          ) : (
            <ContentEditable hidden tabIndex={-1} aria-hidden="true" />
          )
        }
        placeholder={
          view === "visual" && placeholder ? (
            <span className="fa-rich-text-placeholder">{placeholder}</span>
          ) : null
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      {view === "markdown" ? (
        <Textarea
          {...aria}
          id={id}
          name={name}
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          invalid={invalid}
          spellCheck={false}
          placeholder={placeholder}
          resize={false}
          className="fa-rich-text-source"
          ref={(element) => assignRef(ref, element)}
          minRows={1}
          maxRows={1000}
        />
      ) : null}
      {view === "visual" && name ? (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      ) : null}
    </div>
  );
}

/** Lazy internal engine. The public entry imports no Lexical runtime until used. */
export default function RichTextEditor({
  value = "",
  onValueChange,
  view: controlledView,
  defaultView = "visual",
  onViewChange,
  sourceView = true,
  placeholder = "Write a document…",
  minHeight = 160,
  maxHeight = 480,
  resize = true,
  spellCheck = true,
  disabled,
  readOnly,
  className,
  style,
  ref,
  onBlur,
  onError,
  ...props
}: RichTextInputProps) {
  const [innerView, setView] = useState<RichTextView>(defaultView);
  const view = sourceView ? (controlledView ?? innerView) : "visual";
  const namespace = useId();
  const [config] = useState(() => ({
    namespace,
    editable: !disabled && !readOnly,
    nodes: [
      HeadingNode,
      QuoteNode,
      CodeNode,
      ListNode,
      ListItemNode,
      ...MARKDOWN_LINK_NODES,
      MarkdownImageNode,
    ],
    theme: THEME,
    editorState: () => {
      $convertFromMarkdownString(
        value,
        MARKDOWN_TRANSFORMERS,
        undefined,
        false,
      );
      $setSelection(null);
    },
    onError: (error: Error) => {
      onError?.(error);
      if (!onError) console.error("RichTextInput:", error);
    },
  }));
  return (
    <div
      className={cx("fa-control fa-rich-text", className)}
      data-view={view}
      data-readonly={readOnly ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-invalid={props.invalid ? "" : undefined}
      data-resize={resize ? "" : undefined}
      style={
        {
          ...style,
          "--_rich-min": `${minHeight}px`,
          "--_rich-max": `${maxHeight}px`,
        } as CSSProperties
      }
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          onBlur?.(event);
      }}
    >
      <LexicalComposer initialConfig={config}>
        <div className="fa-rich-text-toolbar">
          <EditorToolbar
            disabled={disabled || readOnly || view === "markdown"}
            uploadAttachment={props.uploadAttachment}
            attachmentAccept={props.attachmentAccept}
            onAttachmentError={props.onAttachmentError}
          />
          {sourceView ? (
            <div className="fa-rich-text-modes-slot">
              <Segmented
                className="fa-rich-text-modes"
                size="sm"
                options={RICH_TEXT_VIEWS}
                value={view}
                disabled={disabled}
                aria-label="Document view"
                onValueChange={(next) => {
                  if (controlledView === undefined) setView(next);
                  onViewChange?.(next);
                }}
              />
            </div>
          ) : null}
        </div>
        <MarkdownState
          value={value}
          onValueChange={onValueChange}
          editable={!disabled && !readOnly && view === "visual"}
        />
        <EditorContent
          {...props}
          value={value}
          onValueChange={onValueChange}
          view={view}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={spellCheck}
          ref={ref}
        />
        <HistoryPlugin />
        <ListPlugin shouldPreserveNumbering />
        <CheckListPlugin />
        <LinkPlugin
          validateUrl={isSafeRichTextUrl}
          attributes={{ rel: "noopener noreferrer" }}
        />
        <LinkActivation readOnly={readOnly} disabled={disabled} />
        <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
      </LexicalComposer>
    </div>
  );
}
