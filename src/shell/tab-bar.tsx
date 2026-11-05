import { useMessages } from "../lib/i18n/index.js"
import { shellMessages } from "./messages.js"
/**
 * TabBar — phone navigation (R6.7, R21): the rail becomes a floating glass pill above the
 * bottom safe area with four or five destinations and "More". The active tab is an accent
 * icon on an accent-soft capsule. While content scrolls down the bar condenses (labels
 * fold away); scrolling up restores it. Reduced motion only shortens the change.
 *
 * Tabs beyond `maxItems`, or too narrow to stay readable, move into More's sheet (R6.6, R6.7).
 * They stay in the document, hidden, so a row clicks the tab itself and its router link and
 * handler run as they do from the bar. The current destination stays in the bar.
 */
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { IconMoreHorizontal } from "../icons/generated/icons.js";
import { TruncatedText } from "../ui/truncated-text/index.js";
import { cx } from "../lib/cx.js";
import { observeElementSizes } from "../lib/resize-observer.js";
import { useMediaQuery } from "../lib/use-media-query.js";
import { Tooltip } from "../ui/tooltip/index.js";
import { Sheet } from "../ui/sheet/index.js";
import { SHELL_QUERIES } from "./queries.js";
import { tabBarOverflow, type TabBarFitEntry } from "./tab-bar-fit.js";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const CloseMore = /* @__PURE__ */ createContext<(() => void) | null>(null);

/** What a hidden tab's row in the More sheet draws, and the tab the row clicks. */
interface TabEntry {
  label: string;
  icon: ReactNode;
  active: boolean;
  element: { current: HTMLElement | null };
}

interface TabBarOverflowActions {
  /** Keep a tab's latest row. */
  update: (id: string, entry: TabEntry) => void;
  remove: (id: string) => void;
  /** Tabs came, went or changed destination: fit the bar again. */
  changed: () => void;
  /** A hidden tab was used: bring it into the bar, in place of the last one shown. */
  promote: (id: string) => void;
}

interface TabBarOverflowValue {
  actions: TabBarOverflowActions;
  /** The tabs in More, in document order. */
  hidden: readonly string[];
  /** The host wrote its own TabBar.More, so hidden tabs join its sheet. */
  hasMore: boolean;
  rows: ReadonlyMap<string, TabEntry>;
  /** Changes when a hidden tab's row does, so the sheet draws it again. */
  version: number;
}

const TabBarOverflow = /* @__PURE__ */ createContext<TabBarOverflowValue | null>(null);

/** Fit the tabs to the bar's width, before paint and whenever a size changes. */
function useTabBarOverflow(maxItems: number) {
  const listRef = useRef<HTMLUListElement>(null);
  const chosen = useRef<string | null>(null);
  const [rows] = useState(() => new Map<string, TabEntry>());
  const [hidden, setHidden] = useState<readonly string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [version, setVersion] = useState(0);
  const [revision, setRevision] = useState(0);
  const hiddenNow = useRef(hidden);

  const measure = useCallback(() => {
    const list = listRef.current;
    // No width: the bar is not laid out (the Rail replaces it on desktops). Keep what it had.
    if (!list?.clientWidth) return;
    const entries: TabBarFitEntry[] = [];
    let fixed = 0;
    let more = false;
    for (const child of list.children) {
      const id = child.getAttribute("data-tabbar-id");
      if (id) {
        const pinned = id === chosen.current || Boolean(child.querySelector("[data-active]"));
        entries.push({ id, pinned });
        continue;
      }
      const auto = child.getAttribute("data-tabbar-more") === "auto";
      if (auto) continue;
      if (child.hasAttribute("data-tabbar-more")) more = true;
      fixed += 1;
    }
    const first = list.firstElementChild;
    if (!first) return;
    const next = tabBarOverflow({
      room: list.clientWidth,
      gap: Number.parseFloat(getComputedStyle(list).columnGap) || 0,
      // The entries' flex basis is the narrowest readable tab, resolved to pixels.
      tabMin: Number.parseFloat(getComputedStyle(first).flexBasis) || 0,
      maxItems,
      fixed,
      hasMore: more,
      entries,
    });
    setHasMore(more);
    if (next.join() === hiddenNow.current.join()) return;
    hiddenNow.current = next;
    setHidden(next);
  }, [maxItems]);

  useIsoLayoutEffect(measure);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const sizes = observeElementSizes(measure);
    sizes.observe(list);
    // A tab's size follows the UI scale and density, which leave the list's width alone.
    if (list.firstElementChild) sizes.observe(list.firstElementChild);
    return () => sizes.disconnect();
  }, [measure, revision]);

  const latestMeasure = useRef(measure);
  latestMeasure.current = measure;
  const [actions] = useState<TabBarOverflowActions>(() => ({
    update: (id, entry) => {
      const before = rows.get(id);
      rows.set(id, entry);
      const same = before && before.label === entry.label && before.icon === entry.icon && before.active === entry.active;
      if (!same && hiddenNow.current.includes(id)) setVersion((current) => current + 1);
    },
    remove: (id) => {
      rows.delete(id);
    },
    changed: () => setRevision((current) => current + 1),
    promote: (id) => {
      chosen.current = id;
      latestMeasure.current();
    },
  }));
  const value = useMemo<TabBarOverflowValue>(() => ({ actions, hidden, hasMore, rows, version }), [actions, hidden, hasMore, rows, version]);
  return { listRef, value };
}

/**
 * Condense on scroll down (past a small threshold), expand on scroll up. Listens only where
 * the tab bar is shown (phones): the capture listener reads scrollTop on every scroll event in
 * the document, which costs a style recalc per wheel notch on desktop tables.
 */
function useCondensedOnScroll() {
  const [condensed, setCondensed] = useState(false);
  const phone = useMediaQuery(SHELL_QUERIES.phone);
  useEffect(() => {
    if (!phone) return;
    const last = new WeakMap<EventTarget, number>();
    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const top = target.scrollTop;
      const previous = last.get(target) ?? top;
      last.set(target, top);
      const delta = top - previous;
      if (top < 24) setCondensed(false);
      else if (delta > 6) setCondensed(true);
      else if (delta < -6) setCondensed(false);
    };
    document.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      document.removeEventListener("scroll", onScroll, { capture: true });
  }, [phone]);
  return phone && condensed;
}

function Root({
  className,
  children,
  condensed: forced,
  maxItems = 5,
  ...rest
}: ComponentProps<"nav"> & {
  /** Accessible name when a visible label does not name the control. */
  "aria-label": string;
  /** Force the condensed state (documentation); by default it follows scrolling. */
  condensed?: boolean;
  /**
   * The most tabs the bar shows, More included. Tabs beyond it, or too narrow to stay readable
   * at the bar's width, move into More's sheet, and the current destination stays in the bar.
   * A TabBar.More you write keeps its own rows, after those; without one, More appears when needed.
   * @defaultValue 5
   */
  maxItems?: number;
}) {
  const scrolled = useCondensedOnScroll();
  const condensed = forced ?? scrolled;
  const overflow = useTabBarOverflow(maxItems);
  return (
    <TabBarOverflow.Provider value={overflow.value}>
      <nav
        {...rest}
        className={cx("glass-chrome fa-tabbar", className)}
        data-condensed={condensed ? "" : undefined}
      >
        <ul ref={overflow.listRef} className="fa-tabbar-list">
          {children}
          {overflow.value.hidden.length && !overflow.value.hasMore ? <More auto>{null}</More> : null}
        </ul>
      </nav>
    </TabBarOverflow.Provider>
  );
}

export interface TabBarItemProps extends Omit<ComponentProps<"a">, "children"> {
  icon: ReactNode;
  label: string;
  /** Marks the current destination or active choice. */
  active?: boolean;
  render?: ReactElement;
}

function Item({
  icon,
  label,
  active = false,
  render,
  className,
  ...rest
}: TabBarItemProps) {
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  const overflow = useContext(TabBarOverflow);
  const actions = overflow?.actions;
  const inMore = overflow?.hidden.includes(id) ?? false;

  useIsoLayoutEffect(() => {
    actions?.update(id, { label, icon, active, element: ref });
  });
  useIsoLayoutEffect(() => {
    return () => actions?.remove(id);
  }, [actions, id]);
  // Coming, going or becoming the current destination changes what fits.
  useIsoLayoutEffect(() => {
    actions?.changed();
    return () => actions?.changed();
  }, [actions, active]);

  const element = useRender({
    defaultTagName: "button",
    render,
    ref,
    props: mergeProps<"a">(
      {
        className: cx("fa-tabbar-item fa-pressable", className),
        "aria-current": active ? "page" : undefined,
        // Used from More: it joins the bar, so anything it opens has an anchor.
        onClick: () => {
          if (inMore) actions?.promote(id);
        },
        children: (
          <>
            <span className="fa-tabbar-icon">{icon}</span>
            <span className="fa-tabbar-label">{label}</span>
          </>
        ),
      },
      {
        ...rest,
        "data-active": active ? "" : undefined,
      } as ComponentProps<"a">,
    ),
  });
  return (
    <li className="fa-tabbar-entry" data-tabbar-id={id} data-overflowed={inMore ? "" : undefined}>
      <Tooltip content={label} describe={false}>
        {element}
      </Tooltip>
    </li>
  );
}

/**
 * The last tab: opens the remaining destinations in a bottom Sheet, the tabs that did not fit
 * first and then its own MoreItem rows. The bar adds one by itself when tabs do not fit; write
 * one for destinations that never belong in the bar.
 */
function More({
  label: labelProp,
  title: titleProp,
  active = false,
  auto = false,
  children,
}: {
  label?: string;
  title?: string;
  /** Marks the current destination or active choice. */
  active?: boolean;
  /** Internal: the one the bar adds by itself. */
  auto?: boolean;
  children: ReactNode;
}) {
  const overflow = useContext(TabBarOverflow);
  const hidden = (overflow?.hidden ?? []).flatMap((id) => {
    const row = overflow?.rows.get(id);
    return row ? [{ id, ...row }] : [];
  });
  const messages = useMessages(shellMessages)
  const label = labelProp ?? messages.more
  const title = titleProp ?? messages.more

  const [open, setOpen] = useState(false);
  return (
    <li className="fa-tabbar-entry" data-tabbar-more={auto ? "auto" : ""}>
      <button
        type="button"
        className="fa-tabbar-item fa-pressable"
        data-active={active ? "" : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="fa-tabbar-icon">
          <IconMoreHorizontal />
        </span>
        <span className="fa-tabbar-label">{label}</span>
      </button>
      <Sheet.Root
        side="bottom"
        open={open}
        onOpenChange={(next) => setOpen(next)}
      >
        <Sheet.Popup size="sm">
          <Sheet.Header title={title} />
          <Sheet.Body>
            <CloseMore.Provider value={() => setOpen(false)}>
              <ul className="fa-tabbar-more-list">
                {hidden.map((row) => (
                  <MoreItem
                    key={row.id}
                    icon={row.icon}
                    label={row.label}
                    active={row.active}
                    onClick={() => row.element.current?.click()}
                  />
                ))}
                {children}
              </ul>
            </CloseMore.Provider>
          </Sheet.Body>
        </Sheet.Popup>
      </Sheet.Root>
    </li>
  );
}

function MoreItem({
  icon,
  label,
  active = false,
  render,
  className,
  onClick,
  ...rest
}: TabBarItemProps) {
  const close = useContext(CloseMore);
  const element = useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"a">(
      {
        className: cx("fa-item fa-tabbar-more-item", className),
        "aria-current": active ? "page" : undefined,
        onClick: (event) => {
          onClick?.(event);
          close?.();
        },
        children: (
          <>
            {icon}
            <TruncatedText className="fa-item-label">{label}</TruncatedText>
          </>
        ),
      },
      {
        ...rest,
        "data-active": active ? "" : undefined,
      } as ComponentProps<"a">,
    ),
  });
  return <li>{element}</li>;
}

/**
 * A row of the More sheet that is not a destination (the product's module switch). Choosing
 * inside it closes the sheet, like choosing a destination.
 */
function MoreSection({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const close = useContext(CloseMore);
  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- closes after the control inside handled the choice; the control has its own keys
    <li
      className={cx("fa-tabbar-more-section", className)}
      onClick={() => close?.()}
    >
      {children}
    </li>
  );
}

/** Compose primary application navigation for a narrow viewport, with labelled items and active-state feedback. */
export const TabBar = { Root, Item, More, MoreItem, MoreSection };
