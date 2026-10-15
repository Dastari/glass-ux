import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { openRichTextLink } from "./urls.js";

/** Editing clicks place the caret. Read-only or deliberate modified clicks open a safe link. */
export function LinkActivation({
  readOnly,
  disabled,
}: {
  readOnly?: boolean;
  disabled?: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerRootListener((root) => {
        if (!root) return;
        const activate = (event: MouseEvent) => {
          if (event.defaultPrevented) return;
          const target = event.target;
          if (!(target instanceof Element)) return;
          const anchor = target.closest("a");
          if (!anchor || !root?.contains(anchor)) return;
          if (event.type === "auxclick" && event.button !== 1) return;
          // Read-only anchors use native navigation, keyboard activation and browser menus.
          if (
            readOnly &&
            !disabled &&
            root.ownerDocument.getSelection()?.isCollapsed
          )
            return;
          event.preventDefault();
          if (
            disabled ||
            !(readOnly || event.ctrlKey || event.metaKey || event.button === 1)
          )
            return;
          // Dragging across link text selects it instead of unexpectedly opening a page.
          if (!root.ownerDocument.getSelection()?.isCollapsed) return;
          const url = anchor.getAttribute("href");
          if (url) openRichTextLink(url);
        };
        root.addEventListener("click", activate, true);
        root.addEventListener("auxclick", activate, true);
        return () => {
          root.removeEventListener("click", activate, true);
          root.removeEventListener("auxclick", activate, true);
        };
      }),
    [editor, readOnly, disabled],
  );
  return null;
}
