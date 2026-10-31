import { useMessages } from "../../lib/i18n/index.js"
import { richTextMessages } from "./messages.js"
import { Toolbar } from "@base-ui/react/toolbar";
import { $createCodeNode, $isCodeNode } from "@lexical/code";
import {
  $createLinkNode,
  $isLinkNode,
  TOGGLE_LINK_COMMAND,
} from "@lexical/link";
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
  IconItalic,
  IconLink,
  IconList,
  IconAttach,
  IconRedo,
  IconUndo,
  IconExternalLink,
} from "../../icons/generated/icons.js";
import { Button, useActionFeedback } from "../button/index.js";
import { Field } from "../field/index.js";
import { Input } from "../input/index.js";
import { Menu, MenuPrimitive } from "../menu/index.js";
import { Popover } from "../popover/index.js";
import { toast } from "../toast/index.js";
import { MarkdownImageNode } from "./image-node.js";
import { BlockStyleLabel, richTextBlocks, RICH_TEXT_BLOCKS as BLOCKS } from "./block-style.js";
import type { RichTextInputProps } from "./rich-text.js";
import { isSafeRichTextUrl, openRichTextLink } from "./urls.js";

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
  /** Called when the button is pressed; it does not take focus from the editor. */
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
  const messages = useMessages(richTextMessages)

  const [editor] = useLexicalComposerContext();
  const [marks, setMarks] = useState({
    bold: false,
    italic: false,
    code: false,
    strikethrough: false,
    link: false,
  });
  const [block, setBlock] = useState<Block>("paragraph");
  const [blockOpen, setBlockOpen] = useState(false);
  const [list, setList] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [linkError, setLinkError] = useState<string>();
  const upload = useActionFeedback();
  const uploading = upload.status === "pending";
  const [uploadError, setUploadError] = useState<string>();
  const selection = useRef<BaseSelection | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    if (disabled) {
      setLinkOpen(false);
      setBlockOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    mounted.current = true;
    const refresh = () => {
      const next = $getSelection();
      if (!$isRangeSelection(next)) return;
      selection.current = next.clone();
      const anchor = next.anchor.getNode();
      const parent = anchor.getParent();
      const bold = next.hasFormat("bold");
      const italic = next.hasFormat("italic");
      const code = next.hasFormat("code");
      const strikethrough = next.hasFormat("strikethrough");
      const link = $isLinkNode(anchor) || $isLinkNode(parent);
      // Unchanged flags keep the same state object, so a keystroke does not re-render the toolbar.
      setMarks((prev) =>
        prev.bold === bold && prev.italic === italic && prev.code === code && prev.strikethrough === strikethrough && prev.link === link
          ? prev
          : { bold, italic, code, strikethrough, link },
      );
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
    if (disabled || !editor.isEditable()) return;
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
    if (disabled || !editor.isEditable()) return;
    const next = url.trim();
    if (!remove && !isSafeRichTextUrl(next)) {
      setLinkError(messages.invalidLink);
      return;
    }
    editor.update(() => {
      restore();
      const current = $getSelection();
      if (
        !remove &&
        $isRangeSelection(current) &&
        !current.getTextContent().trim() &&
        !marks.link
      ) {
        // Insert a dedicated node: toggling a link at a collapsed caret would wrap
        // the surrounding text node as well as the newly inserted address.
        const link = $createLinkNode(next);
        link.append($createTextNode(next));
        current.insertNodes([link]);
        link.selectEnd();
      } else editor.dispatchCommand(TOGGLE_LINK_COMMAND, remove ? null : next);
    });
    setLinkOpen(false);
    editor.focus();
  };
  const attach = async (file: File) => {
    if (!uploadAttachment) return;
    setUploadError(undefined);
    const saved = selection.current?.clone() ?? null;
    await upload.run(async () => {
      const attachment = await uploadAttachment(file);
      if (!isSafeRichTextUrl(attachment.url, attachment.kind === "image"))
        throw new Error(
          messages.unsafeAttachment,
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
    }, (error) => {
      if (!mounted.current) return;
      const message =
        error instanceof Error
          ? error.message
          : messages.attachmentError;
      // Reported in place (the Attach button's error face and tooltip) and in a toast,
      // never as an injected row that would push the editor down.
      setUploadError(message);
      if (onAttachmentError) onAttachmentError(error);
      else toast.danger(messages.fileNotAttached, { description: message });
    });
  };

  return (
    <>
      <Toolbar.Root
        className="fa-rich-text-formatting"
        aria-label={messages.textFormatting}
        disabled={disabled}
      >
        <Menu.Root open={blockOpen && !disabled} onOpenChange={setBlockOpen}>
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
                    aria-label={messages.blockStyle(richTextBlocks(messages).find((item) => item.value === block)?.label ?? messages.paragraph)}
                    disabled={disabled}
                  >
                    <BlockStyleLabel value={block} />
                  </Button>
                }
              />
            }
          />
          <Menu.Popup>
            <MenuPrimitive.RadioGroup value={block} onValueChange={changeBlock}>
              {richTextBlocks(messages).map((item) => (
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
          label={messages.bold}
          active={marks.bold}
          disabled={disabled}
          shortcut="mod+b"
          onClick={() => format("bold")}
        >
          <strong>{messages.b}</strong>
        </Tool>
        <Tool
          label={messages.italic}
          icon={<IconItalic />}
          active={marks.italic}
          disabled={disabled}
          shortcut="mod+i"
          onClick={() => format("italic")}
        />
        <Tool
          label={messages.inlineCode}
          icon={<IconCode />}
          active={marks.code}
          disabled={disabled}
          onClick={() => format("code")}
        />
        <Tool
          label={messages.strikethrough}
          active={marks.strikethrough}
          disabled={disabled}
          onClick={() => format("strikethrough")}
        >
          <s>{messages.s}</s>
        </Tool>
        <Tool
          label={messages.bulletList}
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
          label={messages.numberedList}
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
          label={messages.taskList}
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
          open={linkOpen && !disabled}
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
                    aria-label={messages.editLink}
                    disabled={disabled}
                    onMouseDown={(event) => event.preventDefault()}
                  />
                }
              />
            }
          />
          <Popover.Popup title={messages.link} size="sm" align="start">
            <div className="fa-rich-text-link-form">
              <Field
                label={messages.linkAddress}
                error={linkError}
                hint={messages.linkHint}
              >
                <Input
                  disabled={disabled}
                  value={url}
                  onValueChange={(value) => {
                    setUrl(value);
                    if (linkError)
                      setLinkError(
                        isSafeRichTextUrl(value.trim()) ? undefined : linkError,
                      );
                  }}
                  placeholder={messages.httpsExampleCom}
                  autoComplete="off"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyLink();
                    }
                  }}
                />
              </Field>
              <Button
                type="button"
                size="sm"
                disabled={disabled}
                onClick={() => applyLink()}
              >
                {messages.applyLink} </Button>
              {marks.link ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon={<IconExternalLink />}
                    disabled={disabled || !isSafeRichTextUrl(url.trim())}
                    onClick={() => openRichTextLink(url.trim())}
                  >
                    {messages.openLink} </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => applyLink(true)}
                  >
                    {messages.removeLink} </Button>
                </>
              ) : null}
            </div>
          </Popover.Popup>
        </Popover.Root>
        <Tool
          label={messages.undo}
          icon={<IconUndo />}
          disabled={disabled || !canUndo}
          shortcut="mod+z"
          onClick={() => {
            editor.dispatchCommand(UNDO_COMMAND, undefined);
            editor.focus();
          }}
        />
        <Tool
          label={messages.redo}
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
                aria-label={messages.attachFile}
                status={upload.status}
                statusAnnouncement={false}
                tooltip={
                  upload.status === "error" && uploadError
                    ? uploadError
                    : undefined
                }
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
          aria-label={messages.fileAttachment}
          tabIndex={-1}
          accept={attachmentAccept}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void attach(file);
          }}
        />
      ) : null}
      {uploadAttachment ? (
        <span className="sr-only" role="status">
          {uploadError}
        </span>
      ) : null}
    </>
  );
}
