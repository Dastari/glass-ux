import { useMessages } from "../lib/i18n/index.js"
import { windowsMessages } from "./messages.js"
/**
 * Window actions that give way when the app bar runs out of room (R14.1). A `Window.Action`
 * is one action: how it shows in the app bar (its children) and how it reads in the trailing
 * "More" menu (`label`, `icon`, `onSelect`, or its own `menu` content). Secondary actions fold
 * into More from the last one back; primary actions, plain children of `Window.Actions` and the
 * window controls never fold or leave the bar. The title and the scope chip give way first:
 * the chip to its avatar, the title down to `--_title-min` (or its own width when shorter).
 *
 * Widths are read where layout is already done: in a layout effect after the actions render,
 * and in the ResizeObserver callback for the app bar and each action (docs/performance.md).
 * A folded action keeps the width it last showed at, so the bar does not flicker between
 * forms at its edge.
 */
import {
  Children,
  createContext,
  Fragment,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type Ref,
} from "react";
import { flushSync } from "react-dom";
import { IconMoreHorizontal } from "../icons/generated/icons.js";
import { remPx } from "../lib/rem.js";
import { Button } from "../ui/button/index.js";
import { Menu } from "../ui/menu/index.js";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

export type WindowActionPriority = "primary" | "secondary";

export interface WindowActionProps {
  /** Names the action as an item in the More menu once it has folded away. */
  label: string;
  /** The item's icon in the More menu. */
  icon?: ReactNode;
  /**
   * `secondary` (the default) folds into the More menu when the app bar runs out of room,
   * the last ones first; `primary` always stays in the bar.
   */
  priority?: WindowActionPriority;
  /** Called with no arguments when the person chooses the action from the More menu. */
  onSelect?: () => void;
  /** The More menu item is disabled. */
  disabled?: boolean;
  /**
   * The action's own content for the More menu, in place of one item: a submenu
   * (`Menu.Submenu`) for an action that opens a menu, radio items for a Segmented choice.
   */
  menu?: ReactNode;
  /** The action as it shows in the app bar: a ghost sm Button, a Segmented, a Menu trigger. */
  children: ReactNode;
}

interface ActionInfo {
  label: string;
  icon?: ReactNode;
  priority: WindowActionPriority;
  onSelect?: () => void;
  disabled?: boolean;
  menu?: ReactNode;
}

/** The actions' More-menu forms, kept outside React state so updating one re-renders only More. */
function createInfoStore() {
  const map = new Map<string, ActionInfo>();
  const listeners = new Set<() => void>();
  let version = 0;
  return {
    map,
    set(id: string, info: ActionInfo) {
      map.set(id, info);
      version += 1;
      for (const listener of listeners) listener();
    },
    remove(id: string) {
      if (!map.delete(id)) return;
      version += 1;
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
  };
}
type InfoStore = ReturnType<typeof createInfoStore>;

interface OverflowContextValue {
  folded: ReadonlySet<string>;
  store: InfoStore;
}

const OverflowContext = /* @__PURE__ */ createContext<OverflowContextValue | null>(null);

/**
 * One window action with a priority (see the module comment). Outside `Window.Actions` or a
 * frame's `actions` it renders its children as they are.
 */
export function WindowAction({ label, icon, priority = "secondary", onSelect, disabled, menu, children }: WindowActionProps) {
  const id = useId();
  const context = useContext(OverflowContext);
  const folded = context?.folded.has(id) ?? false;
  useIsomorphicLayoutEffect(() => {
    context?.store.set(id, { label, icon, priority, onSelect, disabled, menu });
  });
  useIsomorphicLayoutEffect(() => () => context?.store.remove(id), [context, id]);
  if (!context) return <>{children}</>;
  return (
    <span className="fa-window-action" data-action={id} data-priority={priority} hidden={folded || undefined}>
      {folded ? null : children}
    </span>
  );
}

/** Pixels from a length token's computed text ("6rem", "96px"). */
function pixels(value: string): number {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return 0;
  return value.trim().endsWith("rem") ? number * remPx() : number;
}

/**
 * Which secondary actions fold. `avail` is the room the actions may take; `items` are the
 * actions in order with their widths. The last secondary actions fold first; once any fold,
 * More takes `more` (and a gap) of the room.
 */
export function foldActions(
  items: ReadonlyArray<{ id: string | null; width: number; secondary: boolean }>,
  avail: number,
  gap: number,
  more: number,
): Set<string> {
  const total = (list: typeof items) => list.reduce((sum, item) => sum + item.width, 0) + gap * Math.max(0, list.length - 1);
  if (total(items) <= avail) return new Set();
  const folded = new Set<string>();
  const kept = [...items];
  for (let index = kept.length - 1; index >= 0; index--) {
    const item = kept[index]!;
    if (!item.secondary || item.id === null) continue;
    folded.add(item.id);
    kept.splice(index, 1);
    if (total(kept) + gap + more <= avail) break;
  }
  return folded;
}

/** Manages the actions in one app bar's actions container: what folds, and the More menu. */
export function ActionsOverflow({ children }: { children: ReactNode }) {
  const marker = useRef<HTMLSpanElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const store = useMemo(createInfoStore, []);
  const widths = useRef(new Map<string, number>());
  const moreWidth = useRef(0);
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set());
  // No actions (`{fullscreen ? null : actions}`): nothing in the bar, so the slot stays :empty.
  const empty = Children.toArray(children).length === 0;
  const foldedRef = useRef(folded);
  foldedRef.current = folded;

  const measure = () => {
    const container = marker.current?.parentElement;
    const bar = container?.closest<HTMLElement>(".fa-window-appbar");
    if (!container || !bar) return null;
    const barStyle = getComputedStyle(bar);
    const content = bar.clientWidth - pixels(barStyle.paddingInlineStart) - pixels(barStyle.paddingInlineEnd);
    const gap = pixels(barStyle.columnGap);
    const titleMin = pixels(barStyle.getPropertyValue("--_title-min"));
    // Everything else in the bar at the size it gives way to: the title to its floor, the
    // scope chip to its minimum, the rest (icon, controls) as they are.
    let others = 0;
    let count = 0;
    for (const child of bar.children) {
      if (child === container || !(child instanceof HTMLElement)) continue;
      const style = getComputedStyle(child);
      if (style.display === "none") continue;
      count += 1;
      const margins = pixels(style.marginInlineStart) + pixels(style.marginInlineEnd);
      if (child.classList.contains("fa-window-heading")) {
        // The title's own text width (a range over it): its box fills the row whatever the text.
        const natural = Math.max(
          0,
          ...[...child.querySelectorAll(".fa-truncate")].map((node) => {
            const range = document.createRange();
            range.selectNodeContents(node);
            return range.getBoundingClientRect().width;
          }),
        );
        others += Math.min(Math.ceil(natural), titleMin) + margins;
      } else if (child.classList.contains("fa-window-scope")) others += pixels(style.minWidth) + margins;
      else others += child.getBoundingClientRect().width + margins;
    }
    const avail = content - others - gap * count;
    const actionGap = pixels(getComputedStyle(container).columnGap);
    const items: Array<{ id: string | null; width: number; secondary: boolean }> = [];
    for (const child of container.children) {
      if (!(child instanceof HTMLElement) || child === marker.current || child.dataset.more !== undefined) continue;
      const id = child.dataset.action ?? null;
      if (id === null) {
        // A plain child of Window.Actions: it stays, at its own width.
        if (getComputedStyle(child).display !== "none") items.push({ id: null, width: child.getBoundingClientRect().width, secondary: false });
        continue;
      }
      if (!child.hidden) widths.current.set(id, child.getBoundingClientRect().width);
      items.push({ id, width: widths.current.get(id) ?? 0, secondary: child.dataset.priority !== "primary" });
    }
    if (moreRef.current) moreWidth.current = moreRef.current.getBoundingClientRect().width;
    // Until More has shown, it is a square icon button the height of the actions row.
    const more = moreWidth.current || container.getBoundingClientRect().height;
    return foldActions(items, avail, actionGap, more);
  };

  const update = (sync: boolean) => {
    const next = measure();
    if (!next) return;
    const current = foldedRef.current;
    if (next.size === current.size && [...next].every((id) => current.has(id))) return;
    if (sync) flushSync(() => setFolded(next));
    else setFolded(next);
  };

  // When the actions change (their order, labels, priorities, or whether More is showing):
  // layout is done, nothing is forced mid-commit. Size changes of the bar and its contents
  // arrive through the observers below, so a render that changes none of these measures nothing.
  const measured = useRef<string | null>(null);
  useIsomorphicLayoutEffect(() => {
    const container = marker.current?.parentElement;
    if (!container) {
      measured.current = null;
      return;
    }
    const signature = [
      folded.size > 0,
      ...Array.from(container.children, (child) => {
        const id = (child as HTMLElement).dataset?.action;
        if (id === undefined) return "";
        const info = store.map.get(id);
        return `${id}:${info?.priority}:${info?.label}`;
      }),
    ].join("\n");
    if (signature === measured.current) return;
    measured.current = signature;
    update(false);
  });

  // When the bar or an action changes size.
  useIsomorphicLayoutEffect(() => {
    const container = marker.current?.parentElement;
    const bar = container?.closest(".fa-window-appbar");
    if (!container || !bar || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => update(true));
    observer.observe(bar);
    // The actions and the rest of the bar (scope, controls) take room from each other.
    const watch = () => {
      for (const child of container.children) observer.observe(child);
      for (const child of bar.children) observer.observe(child);
    };
    watch();
    const added = new MutationObserver(watch);
    added.observe(container, { childList: true });
    added.observe(bar, { childList: true });
    // The title's text changes how much room it keeps without resizing its box.
    const heading = bar.querySelector(".fa-window-heading");
    const retitled = new MutationObserver(() => update(true));
    if (heading) retitled.observe(heading, { childList: true, characterData: true, subtree: true });
    return () => {
      observer.disconnect();
      added.disconnect();
      retitled.disconnect();
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- update reads refs only
  }, [empty]);

  const value = useMemo(() => ({ folded, store }), [folded, store]);
  if (empty) return null;
  return (
    <OverflowContext.Provider value={value}>
      <span ref={marker} hidden aria-hidden className="fa-window-actions-marker" />
      {children}
      {folded.size ? <MoreMenu store={store} folded={folded} buttonRef={moreRef} container={() => marker.current?.parentElement ?? null} /> : null}
    </OverflowContext.Provider>
  );
}

/** The trailing More menu: the folded actions in their bar order. */
function MoreMenu({ store, folded, buttonRef, container }: { store: InfoStore; folded: ReadonlySet<string>; buttonRef: Ref<HTMLButtonElement>; container: () => HTMLElement | null }) {
  const messages = useMessages(windowsMessages)

  useSyncExternalStore(store.subscribe, store.version, store.version);
  // Bar order: the order of the actions' places in the container (folded ones keep a place).
  const order = [...(container()?.querySelectorAll<HTMLElement>("[data-action]") ?? [])].map((element) => element.dataset.action!);
  const ids = order.filter((id) => folded.has(id));
  return (
    <span className="fa-window-more" data-more="">
      <Menu.Root>
        <Menu.Trigger render={<Button ref={buttonRef} variant="ghost" size="sm" icon={<IconMoreHorizontal />} aria-label={messages.moreActions} />} />
        <Menu.Popup align="end">
          {ids.map((id) => {
            const info = store.map.get(id);
            if (!info) return null;
            if (info.menu) return <Fragment key={id}>{info.menu}</Fragment>;
            return (
              <Menu.Item key={id} icon={info.icon} disabled={info.disabled} onClick={info.onSelect}>
                {info.label}
              </Menu.Item>
            );
          })}
        </Menu.Popup>
      </Menu.Root>
    </span>
  );
}
