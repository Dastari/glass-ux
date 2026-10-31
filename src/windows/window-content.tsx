import { useMessages } from "../lib/i18n/index.js"
import { windowsMessages } from "./messages.js"
import { EmptyState } from "../ui/empty-state/index.js";
/**
 * Window bodies: the lazy kind component, and the slots a body uses to put things in its
 * frame (actions in the app bar, live state in the status bar and on the dock).
 *
 * Bodies are memoised on { id, kind, params }: moving, resizing, focusing or re-stacking a
 * window re-renders its frame, never its content.
 */
import {
  lazy,
  memo,
  Suspense,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Skeleton } from "../ui/skeleton/index.js";
import { StorageScopeContext } from "../lib/storage-scope.js";
import { useOptionalWindowManager, WindowContext } from "./react.js";
import {
  getWindowKind,
  onWindowKindsChange,
  type WindowContentProps,
} from "./registry.js";
import type { WindowIndicator, WindowParams } from "./types.js";
import { WindowFrame } from "./window-frame.js";
import { ActionsOverflow, WindowAction } from "./window-actions.js";

type LazyBody = LazyExoticComponent<ComponentType<WindowContentProps>>;
const bodies = new Map<string, LazyBody>();
let kindsVersion = 0;
onWindowKindsChange(() => {
  bodies.clear();
  kindsVersion += 1;
});

function subscribeKinds(notify: () => void) {
  return onWindowKindsChange(notify);
}

/** The lazy body component for a kind, created once per registration so React keeps it. */
function useKindBody(kind: string): LazyBody | undefined {
  useSyncExternalStore(
    subscribeKinds,
    () => kindsVersion,
    () => kindsVersion,
  );
  const definition = getWindowKind(kind);
  if (!definition) return undefined;
  let body = bodies.get(kind);
  if (!body) {
    body = lazy(
      definition.load as () => Promise<{
        default: ComponentType<WindowContentProps>;
      }>,
    );
    bodies.set(kind, body);
  }
  return body;
}

function sameParams(a: WindowParams, b: WindowParams) {
  if (a === b) return true;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => a[key] === b[key])
  );
}

export interface WindowContentHostProps {
  id: string;
  /** Semantic entity or content kind, used to choose labels and rendering. */
  kind: string;
  /** Serialisable parameters used to reconstruct the view. */
  params: WindowParams;
}

/** Loads and renders a window's body. Shows a skeleton in the body's box while loading. */
export const WindowContentHost = /* @__PURE__ */ memo(
  function WindowContentHost({ id, kind, params }: WindowContentHostProps) {
  const messages = useMessages(windowsMessages)

    const Body = useKindBody(kind);
    if (!Body) {
      return (
        <WindowFrame.Body>
          <EmptyState icon={null}>
            {messages.unavailableNotice} </EmptyState>
        </WindowFrame.Body>
      );
    }
    return (
      // Components inside remember state per window kind (a split pane's size).
      <StorageScopeContext.Provider value={`window:${kind}`}>
        <Suspense fallback={<WindowBodySkeleton />}>
          {/* oxlint-disable-next-line react/static-components -- one lazy component per kind, cached at module level */}
          <Body id={id} params={params} />
        </Suspense>
      </StorageScopeContext.Provider>
    );
  },
  (a, b) =>
    a.id === b.id && a.kind === b.kind && sameParams(a.params, b.params),
);

/**
 * The loading state of a window body: the scroll body's padding and a few lines. It is a
 * busy status named "Loading window", so assistive technology hears why the body is empty.
 */
export function WindowBodySkeleton() {
  const messages = useMessages(windowsMessages)

  return (
    <WindowFrame.Body role="status" aria-busy="true" aria-label={messages.loadingWindow}>
      <div className="fa-window-skeleton">
        <Skeleton.Text type="subtitle" width="40%" />
        <Skeleton.Text lines={3} width="70%" />
        <Skeleton.Block height="var(--row-h)" radius="tile" />
        <Skeleton.Block height="var(--row-h)" radius="tile" />
      </div>
    </WindowFrame.Body>
  );
}

/**
 * Put window-specific actions into the frame's app bar (ghost sm buttons). Wrap an action in
 * `Window.Action` to give it a priority: when the bar runs out of room, secondary actions fold
 * into a trailing More menu; primary actions, plain children and the window controls stay.
 */
function Actions({ children }: { children: ReactNode }) {
  const context = useContext(WindowContext);
  if (!context?.actionsSlot) return null;
  return createPortal(<ActionsOverflow>{children}</ActionsOverflow>, context.actionsSlot);
}

export interface WindowStatusProps {
  /** What the dock shows for this window: a dot and a one-word state. */
  indicator?: WindowIndicator;
  /** StatusItem / StatusMeta children for the status bar. */
  children?: ReactNode;
}

/**
 * The window's live state. Children render in the frame's status bar; `indicator` also
 * drives the dot on the window's dock entry (R14.4, R17.4).
 */
function Status({ indicator, children }: WindowStatusProps) {
  const context = useContext(WindowContext);
  const manager = useOptionalWindowManager();
  const id = context?.id;
  const tone = indicator?.tone;
  const label = indicator?.label;
  useEffect(() => {
    if (!manager || !id) return;
    manager.setIndicator(id, tone && label ? { tone, label } : null);
  }, [manager, id, tone, label]);
  useEffect(() => {
    if (!manager || !id) return;
    return () => manager.setIndicator(id, null);
  }, [manager, id]);
  if (!context?.statusSlot || !children) return null;
  return createPortal(
    <WindowFrame.StatusGroup>{children}</WindowFrame.StatusGroup>,
    context.statusSlot,
  );
}

/** Slots for window bodies. */
export const Window = {
  Actions,
  Action: WindowAction,
  Status,
  Body: WindowFrame.Body,
  StatusItem: WindowFrame.StatusItem,
  StatusMeta: WindowFrame.StatusMeta,
};
