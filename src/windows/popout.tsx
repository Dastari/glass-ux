/**
 * A popped-out window: the same frame, filling its own browser window. The pop-out route
 * renders this inside its own WindowManagerProvider (same storage key and channel), so the
 * popup is a full participant in sync. Closing the popup hands the window back to the
 * workspace; closing the window from the workspace closes the popup.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useState } from "react";
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
import { describeWindow } from "./registry.js";
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

export function PopoutWindow({ id, productName, scopes }: PopoutWindowProps) {
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

  // The window was closed from the workspace (or never existed): close this popup.
  const gone = hosting && !entry;
  useEffect(() => {
    if (!gone) return;
    const timer = setTimeout(() => window.close(), 250);
    return () => clearTimeout(timer);
  }, [gone]);

  const description = entry ? describeWindow(entry.kind, entry.params) : null;
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
          }
        : null,
    [entry, actionsSlot, statusSlot],
  );

  if (!entry || !description || !context) {
    return (
      <main className="fa-wm-popout-empty">
        {hosting ? (
          <EmptyState icon={null}>
            This window was closed in the workspace.
          </EmptyState>
        ) : null}
      </main>
    );
  }

  const Icon = description.icon;
  return (
    <WindowScopeProvider value={scopes}>
      <WindowFrame.Root
        className="fa-wm-popout"
        focused
        state="popout"
        aria-labelledby={titleId}
        data-window-id={entry.id}
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
