import { Toolbar } from "@base-ui/react/toolbar";
import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  type BaseSelection,
  type TextFormatType,
} from "lexical";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  IconCheck,
  IconChevronDown,
  IconCode,
  IconLink,
  IconList,
  IconAttach,
  IconRedo,
  IconUndo,
} from "../../icons/generated/icons.js";
import { Button } from "../button/index.js";
import { Field } from "../field/index.js";
import { Input } from "../input/index.js";
import { Menu, MenuPrimitive } from "../menu/index.js";
import { Popover } from "../popover/index.js";
import { MarkdownImageNode } from "./image-node.js";
import type { RichTextInputProps } from "./rich-text.js";
import { isSafeRichTextUrl } from "./urls.js";

const BLOCKS = [
  { value: "paragraph", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "quote", label: "Quote" },
  { value: "code", label: "Code block" },
];
type Block = (typeof BLOCKS)[number]["value"];

function Tool({
  label,
  icon,
  children,
  active,
  disabled,
  shortcut,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  children?: ReactNode;
  /** Marks the current destination or active choice. */
  active?: boolean;
  disabled?: boolean;
  /** Keyboard shortcut shown with the control, using the host platform’s modifier keys. */
  shortcut?: string;
  /** Called when click occurs. The callback type specifies its arguments. */
  onClick: () => void;
}) {
  return (
    <Toolbar.Button
      disabled={disabled}
      focusableWhenDisabled={false}
      render={
        <Button
          type="button"
          variant={active ? "soft" : "ghost"}
          size="sm"
          aria-label={label}
          aria-pressed={active}
          icon={icon}
          shortcut={shortcut}
          tooltip={label}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
        >
          {children}
        </Button>
      }
    />
  );
}

/** Internal formatting toolbar. Base UI supplies roving focus and popup keyboard behaviour. */
export function EditorToolbar({
  disabled,
  uploadAttachment,
  attachmentAccept,
  onAttachmentError,
}: Pick<
  RichTextInputProps,
  "disabled" | "uploadAttachment" | "attachmentAccept" | "onAttachmentError"
>) {
  const [editor] = useLexicalComposerContext();
  const [marks, setMarks] = useState({
    bold: false,
    italic: false,
    code: false,
    strikethrough: false,
    link: false,
  });
  const [block, setBlock] = useState<Block>("paragraph");
  const [list, setList] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [linkError, setLinkError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const selection = useRef<BaseSelection | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const refresh = () => {
      const next = $getSelection();
      if (!$isRangeSelection(next)) return;
      selection.current = next.clone();
      const anchor = next.anchor.getNode();
      const parent = anchor.getParent();
      setMarks({
        bold: next.hasFormat("bold"),
        italic: next.hasFormat("italic"),
        code: next.hasFormat("code"),
        strikethrough: next.hasFormat("strikethrough"),
        link: $isLinkNode(anchor) || $isLinkNode(parent),
      });
      let top = anchor;
      let foundList: string | null = null;
      while (top.getParent() && top.getParent()?.getType() !== "root") {
        if ($isListNode(top)) foundList = top.getListType();
        top = top.getParent()!;
      }
      if ($isListNode(top)) foundList = top.getListType();
      setList(foundList);
      setBlock(
        $isHeadingNode(top)
          ? top.getTag()
          : $isQuoteNode(top)
            ? "quote"
            : $isCodeNode(top)
              ? "code"
              : "paragraph",
      );
    };
    const cleanup = [
      editor.registerUpdateListener(({ editorState }) =>
        editorState.read(refresh),
      ),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          refresh();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (value) => {
          setCanUndo(value);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (value) => {
          setCanRedo(value);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    ];
    return () => {
      mounted.current = false;
      cleanup.forEach((remove) => remove());
    };
  }, [editor]);

  const restore = () => {
    const saved = selection.current;
    if (
      $isRangeSelection(saved) &&
      $getNodeByKey(saved.anchor.key) &&
      $getNodeByKey(saved.focus.key)
    )
      $setSelection(saved.clone());
    else $getRoot().selectEnd();
  };
  const format = (value: TextFormatType) => {
    editor.update(() => {
      restore();
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, value);
    });
    editor.focus();
  };
  const changeBlock = (value: string) => {
    editor.update(() => {
      restore();
      if (list) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      $setBlocksType($getSelection(), () =>
        value === "quote"
          ? $createQuoteNode()
          : value === "code"
            ? $createCodeNode()
            : value === "h1" || value === "h2" || value === "h3"
              ? $createHeadingNode(value)
              : $createParagraphNode(),
      );
    });
    editor.focus();
  };
  const applyLink = (remove = false) => {
    const next = url.trim();
    if (!remove && !isSafeRichTextUrl(next)) {
      setLinkError("Use an https://, http://, mailto:, tel: or relative link");
      return;
    }
    editor.update(() => {
      restore();
      const current = $getSelection();
      if (
        !remove &&
        $isRangeSelection(current) &&
        current.isCollapsed() &&
        !marks.link
      )
        current.insertText(next);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, remove ? null : next);
    });
    setLinkOpen(false);
    editor.focus();
  };
  const attach = async (file: File) => {
    if (!uploadAttachment) return;
    setUploading(true);
    setUploadError(undefined);
    const saved = selection.current?.clone() ?? null;
    try {
      const attachment = await uploadAttachment(file);
      if (!isSafeRichTextUrl(attachment.url, attachment.kind === "image"))
        throw new Error(
          "The uploaded file needs a safe HTTP(S) or relative URL",
        );
      if (!mounted.current || !editor.isEditable()) return;
      editor.update(() => {
        selection.current = saved;
        restore();
        const current = $getSelection();
        if (!$isRangeSelection(current)) return;
        if (attachment.kind === "image")
          current.insertNodes([
            new MarkdownImageNode(attachment.url, attachment.label),
          ]);
        else {
          const text = $createTextNode(attachment.label || file.name);
          current.insertNodes([text]);
          text.select(0, text.getTextContentSize());
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, attachment.url);
          text.selectEnd();
        }
      });
      editor.focus();
    } catch (error) {
      if (!mounted.current) return;
      setUploadError(
        error instanceof Error
          ? error.message
          : "The file could not be attached. Try again.",
      );
      onAttachmentError?.(error);
    } finally {
      if (mounted.current) setUploading(false);
    }
  };

  return (
    <>
      <Toolbar.Root
        className="fa-rich-text-formatting"
        aria-label="Text formatting"
        disabled={disabled}
      >
        <Menu.Root>
          <MenuPrimitive.Trigger
            render={
              <Toolbar.Button
                render={
                  <Button
                    type="button"
                    className="fa-rich-text-block"
                    variant="ghost"
                    size="sm"
                    iconEnd={<IconChevronDown />}
                    aria-label="Paragraph style"
                    disabled={disabled}
                  >
                    {BLOCKS.find((item) => item.value === block)?.label ??
                      "Paragraph"}
                  </Button>
                }
              />
            }
          />
          <Menu.Popup>
            <MenuPrimitive.RadioGroup value={block} onValueChange={changeBlock}>
              {BLOCKS.map((item) => (
                <Menu.RadioItem
                  key={item.value}
                  value={item.value}
                  closeOnClick
                >
                  {item.label}
                </Menu.RadioItem>
              ))}
            </MenuPrimitive.RadioGroup>
          </Menu.Popup>
        </Menu.Root>
        <Tool
          label="Bold"
          active={marks.bold}
          disabled={disabled}
          shortcut="mod+b"
          onClick={() => format("bold")}
        >
          <strong>B</strong>
        </Tool>
        <Tool
          label="Italic"
          active={marks.italic}
          disabled={disabled}
          shortcut="mod+i"
          onClick={() => format("italic")}
        >
          <em>I</em>
        </Tool>
        <Tool
          label="Inline code"
          icon={<IconCode />}
          active={marks.code}
          disabled={disabled}
          onClick={() => format("code")}
        />
        <Tool
          label="Strikethrough"
          active={marks.strikethrough}
          disabled={disabled}
          onClick={() => format("strikethrough")}
        >
          <s>S</s>
        </Tool>
        <Tool
          label="Bullet list"
          icon={<IconList />}
          active={list === "bullet"}
          disabled={disabled}
          onClick={() => {
            editor.update(() => {
              restore();
              editor.dispatchCommand(
                list === "bullet"
                  ? REMOVE_LIST_COMMAND
                  : INSERT_UNORDERED_LIST_COMMAND,
                undefined,
              );
            });
            editor.focus();
          }}
        />
        <Tool
          label="Numbered list"
          active={list === "number"}
          disabled={disabled}
          onClick={() => {
            editor.update(() => {
              restore();
              editor.dispatchCommand(
                list === "number"
                  ? REMOVE_LIST_COMMAND
                  : INSERT_ORDERED_LIST_COMMAND,
                undefined,
              );
            });
            editor.focus();
          }}
        >
          1.
        </Tool>
        <Tool
          label="Task list"
          icon={<IconCheck />}
          active={list === "check"}
          disabled={disabled}
          onClick={() => {
            editor.update(() => {
              restore();
              editor.dispatchCommand(
                list === "check"
                  ? REMOVE_LIST_COMMAND
                  : INSERT_CHECK_LIST_COMMAND,
                undefined,
              );
            });
            editor.focus();
          }}
        />
        <Popover.Root
          open={linkOpen}
          onOpenChange={(open) => {
            if (open) {
              setLinkError(undefined);
              editor.getEditorState().read(() => {
                const current = $getSelection();
                if ($isRangeSelection(current)) {
                  const anchor = current.anchor.getNode();
                  const parent = anchor.getParent();
                  setUrl(
                    $isLinkNode(anchor)
                      ? anchor.getURL()
                      : $isLinkNode(parent)
                        ? parent.getURL()
                        : "",
                  );
                }
              });
            }
            setLinkOpen(open);
          }}
        >
          <Popover.Trigger
            render={
              <Toolbar.Button
                render={
                  <Button
                    type="button"
                    variant={marks.link ? "soft" : "ghost"}
                    size="sm"
                    icon={<IconLink />}
                    aria-label="Edit link"
                    disabled={disabled}
                    onMouseDown={(event) => event.preventDefault()}
                  />
                }
              />
            }
          />
          <Popover.Popup title="Link" size="sm" align="start">
            <div className="fa-rich-text-link-form">
              <Field label="Link address" error={linkError}>
                <Input
                  value={url}
                  onValueChange={setUrl}
                  placeholder="https://example.com"
                  autoComplete="off"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyLink();
                    }
                  }}
                />
              </Field>
              <Button type="button" size="sm" onClick={() => applyLink()}>
                Apply link
              </Button>
              {marks.link ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => applyLink(true)}
                >
                  Remove link
                </Button>
              ) : null}
            </div>
          </Popover.Popup>
        </Popover.Root>
        <Tool
          label="Undo"
          icon={<IconUndo />}
          disabled={disabled || !canUndo}
          shortcut="mod+z"
          onClick={() => {
            editor.dispatchCommand(UNDO_COMMAND, undefined);
            editor.focus();
          }}
        />
        <Tool
          label="Redo"
          icon={<IconRedo />}
          disabled={disabled || !canRedo}
          shortcut="mod+shift+z"
          onClick={() => {
            editor.dispatchCommand(REDO_COMMAND, undefined);
            editor.focus();
          }}
        />
        {uploadAttachment ? (
          <Toolbar.Button
            disabled={disabled || uploading}
            render={
              <Button
                type="button"
                size="sm"
                variant="ghost"
                icon={<IconAttach />}
                aria-label="Attach file"
                status={uploading ? "pending" : "idle"}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => fileRef.current?.click()}
              />
            }
          />
        ) : null}
      </Toolbar.Root>
      {uploadAttachment ? (
        <input
          ref={fileRef}
          type="file"
          className="fa-rich-text-file"
          aria-label="File attachment"
          tabIndex={-1}
          accept={attachmentAccept}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void attach(file);
          }}
        />
      ) : null}
      {uploadError ? (
        <span className="fa-rich-text-status" data-error="" role="status">
          {uploadError}
        </span>
      ) : null}
    </>
  );
}
