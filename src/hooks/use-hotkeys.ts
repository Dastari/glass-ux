import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import {
  ariaShortcut,
  detectPlatform,
  matchesShortcut,
  parseShortcut,
} from "../ui/kbd/shortcut.js";

/** Keyboard listener settings. */
export interface HotkeyOptions {
  /** Limit events to this element and descendants. Defaults to document. */
  scope?: RefObject<HTMLElement | null> | "document";
  /** Attach the listener while true (default). */
  enabled?: boolean;
  /** Accept events from text inputs, selects and editable content. Defaults to false. */
  allowInInputs?: boolean;
  /** Cancel the browser's matching shortcut. Defaults to true. */
  preventDefault?: boolean;
}
const subscribePlatform = () => () => {};
const ariaKeys: Record<string, string> = {
  esc: "Escape",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  delete: "Delete",
  contextmenu: "ContextMenu",
};

function ariaHotkey(shortcut: string, platform: "mac" | "other") {
  const value = ariaShortcut(shortcut, platform).split("+");
  const key = parseShortcut(shortcut).key;
  if (ariaKeys[key]) value[value.length - 1] = ariaKeys[key];
  return value.join("+");
}

/**
 * Listen for one or more shortcuts and return their space-separated aria-keyshortcuts value.
 * Mod means Command on Apple platforms and Control elsewhere. Composition and already
 * handled events are ignored. The listener is removed on unmount or when disabled.
 * @example
 * const keys = useHotkeys("mod+k", () => setOpen(true));
 * // <button aria-keyshortcuts={keys}>Search</button>
 */
export function useHotkeys(
  shortcuts: string | readonly string[],
  handler: (event: KeyboardEvent) => void,
  {
    scope = "document",
    enabled = true,
    allowInInputs = false,
    preventDefault = true,
  }: HotkeyOptions = {},
): string {
  const platform = useSyncExternalStore(
    subscribePlatform,
    detectPlatform,
    () => "other" as const,
  );
  const list = (typeof shortcuts === "string" ? [shortcuts] : shortcuts).filter(
    (shortcut) => parseShortcut(shortcut).key,
  );
  const signature = list.join("\n");
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const target = scope === "document" ? document : scope.current;
    if (!target) return;
    const listen = (event: Event) => {
      const key = event as KeyboardEvent;
      if (key.defaultPrevented || key.isComposing) return;
      const path = key.composedPath();
      if (
        !allowInInputs &&
        path.some(
          (node) =>
            node instanceof HTMLElement &&
            (node.matches("input, textarea, select") ||
              node.isContentEditable ||
              node.getAttribute("contenteditable") === "true"),
        )
      )
        return;
      if (
        !signature
          .split("\n")
          .some((shortcut) => matchesShortcut(key, shortcut, platform))
      )
        return;
      if (preventDefault) key.preventDefault();
      latest.current(key);
    };
    target.addEventListener("keydown", listen);
    return () => target.removeEventListener("keydown", listen);
  }, [signature, scope, enabled, allowInInputs, preventDefault, platform]);
  return list.map((shortcut) => ariaHotkey(shortcut, platform)).join(" ");
}
