import { useMessages } from "../../lib/i18n/index.js"
import { richTextMessages } from "./messages.js"
import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { $createLinkNode, $isLinkNode } from "@lexical/link";
import {
  $isListItemNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  BLUR_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_LOW,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
  type NodeKey,
} from "lexical";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { foldText } from "../../lib/fold.js";
import { useLocale } from "../../lib/locale/use-locale.js";
import { Typeahead, useTypeahead, type TypeaheadRect } from "../typeahead/index.js";
import { richTextBlocks } from "./block-style.js";
import type { RichTextBlock, RichTextCommand, RichTextMention, RichTextMentions } from "./rich-text.js";
import { isSafeRichTextUrl } from "./urls.js";

interface Trigger {
  kind: "mention" | "command";
  query: string;
  /** The text node holding the trigger character. */
  key: NodeKey;
  /** The trigger character's offset in that node. */
  start: number;
}

type Item = RichTextMention | RichTextCommand;

const MENTION = /(^|\s)@([\p{L}\p{N}._-]{0,40})$/u;
const COMMAND = /^\/([\p{L}\p{N} -]*)$/u;

/** A slash command or mention being typed at the caret, in plain text outside code and links. */
function $triggerAt(mentions: boolean, commands: boolean): Trigger | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null;
  const node = selection.anchor.getNode();
  if (!$isTextNode(node) || node.hasFormat("code")) return null;
  const parent = node.getParent();
  if ($isCodeNode(parent) || $isLinkNode(parent)) return null;
  const before = node.getTextContent().slice(0, selection.anchor.offset);
  const key = node.getKey();
  if (commands && !node.getPreviousSibling()) {
    const found = before.match(COMMAND);
    if (found) return { kind: "command", query: found[1]!, key, start: 0 };
  }
  if (mentions) {
    const found = before.match(MENTION);
    if (found)
      return { kind: "mention", query: found[2]!, key, start: before.length - found[2]!.length - 1 };
  }
  return null;
}

/** The trigger character's rectangle, read afresh so the list follows the text as it scrolls. */
function triggerRect(editor: LexicalEditor, { key, start }: Trigger): TypeaheadRect {
  const element = editor.getElementByKey(key);
  const text = element?.firstChild;
  if (text?.nodeType === Node.TEXT_NODE && start < (text.textContent?.length ?? 0)) {
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, start + 1);
    const rect = range.getClientRects?.()[0];
    if (rect) return rect;
  }
  return element?.getBoundingClientRect() ?? { x: 0, y: 0, width: 0, height: 0 };
}

function $applyBlock(editor: LexicalEditor, block: RichTextBlock) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  if ($isListItemNode(selection.anchor.getNode().getParent()))
    editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
  if (block === "bullet") editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  else if (block === "number") editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  else if (block === "check") editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
  else
    $setBlocksType($getSelection(), () =>
      block === "quote"
        ? $createQuoteNode()
        : block === "code"
          ? $createCodeNode()
          : block === "paragraph"
            ? $createParagraphNode()
            : $createHeadingNode(block),
    );
}

/**
 * Mentions and a slash menu for the editor, on the shared Typeahead: Lexical finds the
 * trigger, keeps focus in the text and applies the pick; the list knows nothing of Lexical.
 * The surface stays a multi-line textbox, so it takes the list's attributes without the
 * combobox role.
 */
export function TypeaheadPlugin({
  mentions,
  slashCommands,
}: {
  mentions?: RichTextMentions;
  slashCommands?: boolean | readonly RichTextCommand[];
}) {
  const messages = useMessages(richTextMessages);
  const locale = useLocale();
  const [editor] = useLexicalComposerContext();
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [results, setResults] = useState<readonly RichTextMention[]>([]);
  const [loading, setLoading] = useState(false);
  // A dismissed trigger stays closed until the caret leaves it.
  const dismissed = useRef<string | null>(null);
  // The query the rows on show answer, and one whose first row Enter or Tab asked for.
  const answered = useRef<string | null>(null);
  const waiting = useRef<string | null>(null);
  const hasMentions = Boolean(mentions);
  const hasCommands = Boolean(slashCommands);

  const commands = useMemo<readonly RichTextCommand[]>(() => {
    if (Array.isArray(slashCommands)) return slashCommands;
    if (!slashCommands) return [];
    return [
      ...richTextBlocks(messages).map((block) => ({ id: block.value, label: block.label, block: block.value as RichTextBlock })),
      { id: "bullet", label: messages.bulletList, block: "bullet" },
      { id: "number", label: messages.numberedList, block: "number" },
      { id: "check", label: messages.taskList, block: "check" },
    ];
  }, [slashCommands, messages]);

  const close = useCallback(() => {
    setTrigger((current) => {
      if (current) dismissed.current = `${current.key}:${current.start}`;
      return null;
    });
  }, []);

  const pick = (item: Item) => {
    const active = trigger;
    if (!active) return;
    editor.update(() => {
      const node = $getNodeByKey(active.key);
      const selection = $getSelection();
      if (!$isTextNode(node) || !$isRangeSelection(selection)) return;
      const typed = node.select(active.start, selection.anchor.offset);
      if (active.kind === "mention") {
        const mention = item as RichTextMention;
        const text = mention.insert ?? `@${mention.label}`;
        if (mention.href && isSafeRichTextUrl(mention.href)) {
          const link = $createLinkNode(mention.href);
          link.append($createTextNode(text));
          const space = $createTextNode(" ");
          typed.insertNodes([link, space]);
          space.selectEnd();
        } else typed.insertText(`${text} `);
        return;
      }
      const command = item as RichTextCommand;
      if (command.insert !== undefined) typed.insertText(command.insert);
      else typed.removeText();
      if (command.block) $applyBlock(editor, command.block);
    });
    setTrigger(null);
    if (active.kind === "command") (item as RichTextCommand).onSelect?.();
  };

  const filter = useCallback(
    (item: Item, query: string) => foldText(item.label, locale).includes(foldText(query, locale)),
    [locale],
  );
  // A line that merely starts with a slash, and matches nothing, keeps its list closed.
  const open =
    trigger?.kind === "mention" ||
    (trigger?.kind === "command" && commands.some((command) => filter(command, trigger.query)));
  const state = useTypeahead<Item>({
    open,
    query: trigger?.query,
    items: trigger?.kind === "mention" ? results : commands,
    filter: trigger?.kind === "command" ? filter : undefined,
    multiline: true,
    onPick: pick,
    onClose: close,
  });
  const { onKeyDown } = state;

  useEffect(() => {
    const cleanup = [
      editor.registerRootListener((element) => setRoot(element)),
      editor.registerUpdateListener(({ editorState }) => {
        const next = editor.isEditable()
          ? editorState.read(() => $triggerAt(hasMentions, hasCommands))
          : null;
        if (!next) dismissed.current = null;
        setTrigger((current) => {
          if (!next || dismissed.current === `${next.key}:${next.start}`) return null;
          return current?.kind === next.kind && current.query === next.query && current.key === next.key && current.start === next.start
            ? current
            : next;
        });
      }),
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event) => {
          // The rows may still answer an earlier query: "@no" then Enter must not pick from
          // "@". It picks the first row of the answer, unless more typing has moved on.
          if (event.key === "Enter" || event.key === "Tab") {
            const typed = editor.getEditorState().read(() => $triggerAt(hasMentions, hasCommands));
            const closed = typed && dismissed.current === `${typed.key}:${typed.start}`;
            if (typed?.kind === "mention" && !closed && typed.query !== answered.current) {
              event.preventDefault();
              waiting.current = typed.query;
              return true;
            }
          }
          return onKeyDown(event);
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          close();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    ];
    return () => cleanup.forEach((remove) => remove());
  }, [editor, hasMentions, hasCommands, onKeyDown, close]);

  // Mention rows come from the host, at once or later; a newer query cancels an older one.
  const search = mentions?.search;
  const query = trigger?.kind === "mention" ? trigger.query : null;
  useEffect(() => {
    if (query === null || !search) {
      answered.current = null;
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const found = search(query, { signal: controller.signal });
    if (!("then" in found)) {
      answered.current = query;
      setResults(found);
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    found.then(
      (rows) => {
        if (controller.signal.aborted) return;
        answered.current = query;
        setResults(rows);
        setLoading(false);
      },
      () => {
        if (controller.signal.aborted) return;
        answered.current = query;
        setResults([]);
        setLoading(false);
      },
    );
    return () => controller.abort();
  }, [query, search]);

  useEffect(() => {
    if (waiting.current === null || answered.current !== query) return;
    const asked = waiting.current;
    waiting.current = null;
    if (asked === query && results[0]) pick(results[0]);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- it runs when an answer arrives
  }, [results, query]);

  const { "aria-controls": controls, "aria-activedescendant": activeDescendant } = state.textProps;
  useEffect(() => {
    if (!root) return;
    root.setAttribute("aria-autocomplete", "list");
    root.setAttribute("aria-haspopup", "listbox");
    return () => {
      root.removeAttribute("aria-autocomplete");
      root.removeAttribute("aria-haspopup");
    };
  }, [root]);
  useEffect(() => {
    if (!root) return;
    const set = (name: string, value: string | undefined) =>
      value ? root.setAttribute(name, value) : root.removeAttribute(name);
    set("aria-controls", controls);
    set("aria-activedescendant", activeDescendant);
  }, [root, controls, activeDescendant]);

  const anchor = useMemo(
    () => (trigger ? () => triggerRect(editor, trigger) : () => ({ x: 0, y: 0, width: 0, height: 0 })),
    // The list stays where the trigger was typed, however long the query gets.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [editor, trigger?.key, trigger?.start],
  );

  const isMention = trigger?.kind === "mention";
  const renderDetail = mentions?.renderDetail;
  return (
    <Typeahead
      state={state}
      anchor={anchor}
      label={isMention ? (mentions?.label ?? messages.mentions) : messages.commands}
      loading={isMention && loading}
      reserveRows={isMention ? mentions?.reserveRows : undefined}
      renderDetail={isMention && renderDetail ? (item) => renderDetail(item as RichTextMention) : undefined}
    />
  );
}
