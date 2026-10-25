import { useMessages } from "../lib/i18n/index.js"
import { windowsMessages } from "./messages.js"
/**
 * A popped-out window: the same frame, filling its own browser window. The pop-out route
 * renders this inside its own WindowManagerProvider (same storage key and channel), so the
 * popup is a full participant in sync. Closing the popup hands the window back to the
 * workspace; closing the window from the workspace closes the popup.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "../ui/empty-state/index.js";
import {
  WindowContext,
  useWindowEntry,
  useWindowManager,
  type WindowContextValue,
} from "./react.js";
import {
  WindowScopeChip,
  WindowScopeProvider,
  type WindowScopes,
} from "./scope.js";
import { fullscreenSupported, useWindowFullscreen } from "./fullscreen.js";
import { describeWindow, getWindowKind } from "./registry.js";
import { WindowContentHost } from "./window-content.js";
import { WindowFrame } from "./window-frame.js";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface PopoutWindowProps {
  id: string;
  /** Appended to the browser window's title. */
  productName?: string;
  /**
   * How to label the window's organisation. A popped-out window stands on its own, so it
   * shows its scope chip whenever it has a scope (pass `current: null`).
   */
  scopes?: WindowScopes;
}

/**
 * Renders window `id` filling its own browser window, for the pop-out route. It registers
 * as the window's pop-out host while mounted, sets the document title from the window's
 * title, subtitle, scope and `productName`, and closes the browser window once the window
 * is closed from the workspace. Render it inside a `WindowManagerProvider`.
 */
export function PopoutWindow({ id, productName, scopes }: PopoutWindowProps) {
  const messages = useMessages(windowsMessages)

  const manager = useWindowManager();
  const entry = useWindowEntry(id);
  const titleId = useId();
  const [hosting, setHosting] = useState(false);
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null);
  const [statusSlot, setStatusSlot] = useState<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const release = manager.hostPopout(id);
    setHosting(true);
    return release;
  }, [manager, id]);

  // Without storage the popup boots empty and learns the window from the workspace over the
  // channel (WindowManager.requestState), so it waits for that answer before deciding.
  const synced = useFirstSync();
  const frameRef = useRef<HTMLElement>(null);
  const { fullscreen, toggle: toggleFullscreen, exit: exitFullscreen } = useWindowFullscreen(frameRef);

  // The window was closed from the workspace (or never existed): close this popup.
  const gone = hosting && synced && !entry;
  useEffect(() => {
    if (!gone) return;
    const timer = setTimeout(() => window.close(), 250);
    return () => clearTimeout(timer);
  }, [gone]);

  const description = entry ? describeWindow(entry.kind, entry.params, messages) : null;
  const scopeLabel = entry?.scope
    ? (scopes?.describe(entry.scope)?.label ?? entry.scope)
    : undefined;
  const documentTitle = [
    description?.title,
    description?.subtitle,
    scopeLabel,
    productName,
  ]
    .filter(Boolean)
    .join(" · ");
  useEffect(() => {
    if (documentTitle) document.title = documentTitle;
  }, [documentTitle]);

  const context = useMemo<WindowContextValue | null>(
    () =>
      entry
        ? {
            id: entry.id,
            kind: entry.kind,
            params: entry.params,
            actionsSlot,
            statusSlot,
            host: "popout",
            fullscreen,
            exitFullscreen,
          }
        : null,
    [entry, actionsSlot, statusSlot, fullscreen, exitFullscreen],
  );

  if (!entry || !description || !context) {
    return (
      <main className="fa-wm-popout-empty">
        {gone ? (
          <EmptyState icon={null}>
            {messages.thisWindowWasClosedInTheWorkspace} </EmptyState>
        ) : null}
      </main>
    );
  }

  const Icon = description.icon;
  return (
    <WindowScopeProvider value={scopes}>
      <WindowFrame.Root
        ref={frameRef}
        className="fa-wm-popout"
        focused
        state="popout"
        aria-labelledby={titleId}
        data-window-id={entry.id}
        data-fullscreen={fullscreen ? "" : undefined}
      >
        <WindowFrame.AppBar
          icon={Icon ? <Icon /> : null}
          title={description.title}
          subtitle={description.subtitle}
          scope={<WindowScopeChip scope={entry.scope} />}
          titleId={titleId}
          actionsRef={setActionsSlot}
          controls={
            <WindowFrame.Controls
              title={description.title}
              fullscreen={fullscreen}
              onToggleFullscreen={
                getWindowKind(entry.kind)?.fullscreen !== false &&
                fullscreenSupported()
                  ? toggleFullscreen
                  : undefined
              }
              onReturn={() => {
                manager.returnToWorkspace(entry.id);
                window.close();
              }}
              onClose={() => {
                void manager.close(entry.id).then((closed) => {
                  if (closed) window.close();
                });
              }}
            />
          }
        />
        <WindowContext.Provider value={context}>
          <WindowContentHost
            id={entry.id}
            kind={entry.kind}
            params={entry.params}
          />
        </WindowContext.Provider>
        <WindowFrame.StatusBar ref={setStatusSlot} />
      </WindowFrame.Root>
    </WindowScopeProvider>
  );
}

/** How long a popup without storage waits for the workspace to answer before giving up. */
const SYNC_TIMEOUT = 2000;

/**
 * True once the manager knows the windows: at once with storage (read on connect), else on
 * the first state from the workspace, or after SYNC_TIMEOUT when none answers.
 */
function useFirstSync() {
  const manager = useWindowManager();
  const immediate = Boolean(manager.options.storageKey);
  const [synced, setSynced] = useState(immediate);
  useEffect(() => {
    if (immediate) return;
    const done = () => setSynced(true);
    const stop = manager.on("sync", done);
    const timer = setTimeout(done, SYNC_TIMEOUT);
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, [manager, immediate]);
  return synced;
}
