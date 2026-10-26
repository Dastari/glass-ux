import { DirectionPortal } from "../../lib/direction-portal.js"
import { useMessages } from "../../lib/i18n/index.js"
import { contextSwitcherMessages } from "./messages.js"
/**
 * ContextSwitcher — the context you work in, in the top bar (R5.2, R6.9): an organisation,
 * a project, a workspace. First after the logo, so the context you are in is always
 * visible: its avatar and name, "All organisations" (or the host's "all" label) when
 * unscoped, and "+3" when a parent includes its children. The breadcrumb continues from it.
 *
 *   trigger   [avatar] Northstar Studio (+3) ⇅     on the canvas, like a crumb
 *   popup     search · All … · Recent · the parent/child tree     (fa-popup)
 *   phone     the same list in a bottom Sheet
 *
 * Behaviour is Base UI's Combobox with the input inside the popup: typing filters, arrows
 * move, Enter chooses, Esc closes, focus returns to the trigger. The switcher only reports a
 * choice (`onValueChange`); the application decides where that goes (keeping your place,
 * R6.6) and owns the URL.
 *
 * Generic: it knows contexts as a tree of { id, name, parentId, avatar }. The product
 * supplies them (a directory adapter), the words (`labels`, or `switcherLabels(noun)`), the
 * "all" glyph (`icon`) and whether an "all" row exists (`all`).
 */
import { Combobox } from "@base-ui/react/combobox";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  IconCheck,
  IconChevronsUpDown,
  IconOrganisation,
  IconSearch,
} from "../../icons/generated/icons.js";
import { Highlight } from "../../ui/combobox/index.js";
import { cx } from "../../lib/cx.js";
import { useLocale } from "../../lib/locale/use-locale.js";
import { usePopupMetrics } from "../../lib/popup-metrics.js";
import { useMediaQuery } from "../../lib/use-media-query.js";
import { Sheet } from "../../ui/sheet/index.js";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { SHELL_QUERIES } from "../queries.js";
import {
  DEFAULT_SWITCHER_LABELS,
  buildContextTree,
  contextCode,
  contextInitials,
  contextTint,
  switcherGroups,
  type ContextItem,
  type ContextTree,
  type SwitcherGroup,
  type SwitcherLabels,
  type SwitcherRow,
} from "./model.js";
import {
  RemoteFeedback,
  remoteGroups,
  type ContextSwitcherRemote,
} from "./remote.js";
import { popupContainer } from "../../lib/popup-container.js";

/* ── Avatar ─────────────────────────────────────────────────────────────── */

/** The avatar's size: xs 20 · sm 24 · md 32 · lg 40. */
export type ContextAvatarSize = "xs" | "sm" | "md" | "lg";

export interface ContextAvatarProps extends Omit<
  ComponentProps<"span">,
  "children"
> {
  /** The context, or null for the "all" scope. */
  item: Pick<
    ContextItem,
    "id" | "name" | "avatarSrc" | "icon" | "initials" | "tint"
  > | null;
  /** xs 20 (lists, chips) · sm 24 (top bar, dock) · md 32 · lg 40 (page headers). */
  size?: ContextAvatarSize;
  /** Hidden from assistive tech (default): a visible name sits beside it. */
  decorative?: boolean;
  /** The glyph for the "all" scope (default the organisation glyph). */
  icon?: ReactNode;
  /** The accessible name for the "all" scope when not decorative (default "All organisations"). */
  allLabel?: string;
}

/**
 * A context's avatar: its logo, its icon or its initials on its tint. A rounded square, so
 * an organisation or project never reads as a person (people are round, ui/avatar). The
 * "all" scope is a glyph on a neutral tile.
 */
export function ContextAvatar({
  item,
  size = "sm",
  decorative = true,
  icon,
  allLabel: allLabelProp,
  className,
  ...rest
}: ContextAvatarProps) {
 const messages = useMessages(contextSwitcherMessages)
 const allLabel = allLabelProp ?? messages.all
  return (
    <span
      {...rest}
      className={cx("fa-context-avatar", className)}
      data-size={size}
      data-tint={item ? contextTint(item) : "all"}
      data-logo={item?.avatarSrc ? "" : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : (item?.name ?? allLabel)}
      aria-hidden={decorative ? true : undefined}
    >
      {item === null ? (
        (icon ?? <IconOrganisation />)
      ) : item.avatarSrc ? (
        <img
          className="fa-context-avatar-image"
          src={item.avatarSrc}
          alt=""
          draggable={false}
        />
      ) : item.icon ? (
        <span className="fa-context-avatar-icon">{item.icon}</span>
      ) : (
        <span className="fa-context-avatar-initials">
          {item.initials ?? contextInitials(item.name)}
        </span>
      )}
    </span>
  );
}

/* ── Switcher ───────────────────────────────────────────────────────────── */

export interface ContextSwitcherProps<I extends ContextItem = ContextItem> {
  /** Complete local hierarchy, or the loaded flat server results when remote is supplied. */
  items: readonly I[];
  /** Controlled server search/paging. Bypasses local filtering and ignores parent links and recents. */
  remote?: ContextSwitcherRemote;
  /** The current scope: a context id, or null for all (or none, when `all` is false). */
  value: string | null;
  /** A choice was made (also when it is the current one: the caller may ignore it). */
  onValueChange: (value: string | null) => void;
  /** Recently chosen context ids, most recent first (useRecentContexts). */
  recent?: readonly string[];
  /** Controlled open state, so a palette command or a shortcut can open it. */
  open?: boolean;
  /** Called with the next open state when the popup (or phone sheet) opens or closes, including the close after a choice. Pair with `open` to control it. */
  onOpenChange?: (open: boolean) => void;
  /** The words it shows and announces. Default: organisations. Build a set for another noun
   *  with `switcherLabels({ one: "project", other: "projects" })`; single overrides merge
   *  over the default. */
  labels?: Partial<SwitcherLabels>;
  /** Offer an "all" row that clears the scope (default true). Without it, null means nothing
   *  is chosen yet and the trigger reads `labels.choose`. */
  all?: boolean;
  /** The glyph for the "all" scope and for nothing chosen (default the organisation glyph). */
  icon?: ReactNode;
  className?: string;
}

/** The trigger's text for a scope: its name, short code, how many it includes and its accessible name. */
export function describeContext(
  tree: ContextTree,
  value: string | null,
  labels: SwitcherLabels = DEFAULT_SWITCHER_LABELS,
  all = true,
) {
  const item = value ? tree.byId.get(value) : undefined;
  const includes = item ? tree.descendantsOf(item.id).length : 0;
  const name = item?.name ?? (value !== null ? labels.missing : all ? labels.all : labels.choose);
  const code = item ? contextCode(item) : value !== null ? "?" : all ? labels.allShort : labels.title;
  const accessible = includes ? labels.includes(name, includes) : name;
  return { item: item ?? null, name, code, includes, accessible };
}

/** Choose a context (an organisation, a project, a workspace) from a complete local hierarchy or a bounded server directory. */
export function ContextSwitcher<I extends ContextItem>({
  items,
  remote,
  value,
  onValueChange,
  recent = [],
  open: openProp,
  onOpenChange,
  labels: labelsProp,
  all = true,
  icon,
  className,
}: ContextSwitcherProps<I>) {
  const translated = useMessages(contextSwitcherMessages);
  const labels = useMemo(() => ({ ...translated, ...labelsProp }), [translated, labelsProp]);
  const locale = useLocale();
  const tree = useMemo(() => buildContextTree(items, locale), [items, locale]);
  const phone = useMediaQuery(SHELL_QUERIES.phone);
  const [innerOpen, setInnerOpen] = useState(false);
  const open = openProp ?? innerOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  };
  const selectedItem =
    value === null
      ? undefined
      : remote?.selected?.id === value
        ? remote.selected
        : tree.byId.get(value);
  const scope =
    remote && value !== null
      ? {
          item: selectedItem ?? null,
          name: selectedItem?.name ?? labels.missing,
          code: selectedItem ? contextCode(selectedItem) : "?",
          includes: 0,
          accessible: selectedItem?.name ?? labels.missing,
        }
      : describeContext(tree, value, labels, all);
  const changed = useExternalChange(value);
  const fresh = useFreshAfterClose();

  const trigger = (
    <span className="fa-context-switcher-face">
      <ContextAvatar item={scope.item} icon={icon} size="sm" />
      <TruncatedText className="fa-context-switcher-name" tooltipSide="bottom">
        {scope.name}
      </TruncatedText>
      {/* A narrow bar shows the short code instead of the name (top-bar.css). */}
      <span className="fa-context-switcher-code" aria-hidden>
        {scope.code}
      </span>
      {scope.includes ? (
        <span className="fa-context-switcher-includes" aria-hidden>
          +{scope.includes}
        </span>
      ) : null}
      <IconChevronsUpDown className="fa-context-switcher-chevron" />
    </span>
  );
  const triggerProps = {
    ref: fresh.triggerRef,
    className: cx("fa-context-switcher fa-pressable", className),
    "aria-label": `${labels.title}: ${scope.accessible}`,
    "data-scope": value ?? "all",
    "data-changed": changed.active ? "" : undefined,
  };
  const choose = (next: string | null) => {
    setOpen(false);
    changed.chose(next);
    onValueChange(next);
  };
  // Said once when the scope changes from elsewhere (a search result in another context).
  // The status node stays mounted so the message is announced when its text arrives.
  const announcement = (
    <span className="sr-only" role="status">
      {changed.active ? labels.changed(scope.name) : ""}
    </span>
  );

  if (phone) {
    return (
      <>
        <button
          type="button"
          {...triggerProps}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          {trigger}
        </button>
        {announcement}
        <Sheet.Root
          side="bottom"
          open={open}
          onOpenChange={(next) => setOpen(next)}
        >
          <Sheet.Popup size="md">
            <Sheet.Header title={labels.title} />
            {/* Straight in the sheet, not in a Sheet.Body: the search stays put and the list scrolls. */}
            <SwitcherList
              tree={tree}
              items={items}
              remote={remote}
              value={value}
              recent={recent}
              labels={labels}
              all={all}
              icon={icon}
              inline
              placement="sheet"
              onChoose={choose}
            />
          </Sheet.Popup>
        </Sheet.Root>
      </>
    );
  }

  return (
    <>
      <SwitcherList
        key={fresh.generation}
        onOpenChangeComplete={fresh.onOpenChangeComplete}
        tree={tree}
        items={items}
        remote={remote}
        value={value}
        recent={recent}
        labels={labels}
        all={all}
        icon={icon}
        open={open}
        onOpenChange={setOpen}
        onChoose={choose}
        trigger={
          <Combobox.Trigger {...triggerProps}>{trigger}</Combobox.Trigger>
        }
      />
      {announcement}
    </>
  );
}

/**
 * A fresh Combobox after every close. Base UI 1.9's AriaCombobox hands useListNavigation an
 * inline `onNavigate`; the hook's memoised `floating` handlers share a closure context with it,
 * so each open/close pins the previous render's whole scope, its unmounted listbox included
 * (about 400 detached nodes and 46 listeners per switch, docs/performance.md).
 * Remounting the root once the close has finished drops the chain; focus goes back to the new
 * trigger when the switcher had it.
 */
function useFreshAfterClose() {
  const [generation, setGeneration] = useState(0);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const refocus = useRef(false);
  // The new trigger attaches after the old popup and trigger are gone.
  const triggerRef = useCallback((node: HTMLButtonElement | null) => {
    trigger.current = node;
    if (!node || !refocus.current) return;
    refocus.current = false;
    const active = document.activeElement;
    if (!active || active === document.body)
      node.focus({ preventScroll: true });
  }, []);
  const onOpenChangeComplete = (open: boolean) => {
    if (open) return;
    // Base UI returns focus to the trigger after the popup unmounts; the remount replaces both,
    // so the new trigger takes focus if it was in the switcher and nowhere else has it.
    const active = document.activeElement;
    refocus.current =
      active === trigger.current ||
      Boolean(active?.closest(".fa-context-switcher-popup"));
    setGeneration((current) => current + 1);
  };
  return { generation, triggerRef, onOpenChangeComplete };
}

/** How long the trigger stays highlighted after the scope changes from elsewhere. */
const CHANGE_HIGHLIGHT_MS = 1600;

/**
 * Notices a scope change that did not come from this switcher (a search result or a link in
 * another context, Back and Forward), so the trigger can highlight it briefly (R6.9):
 * the user is told the context changed under them. A choice made in the switcher is
 * expected, so it is not highlighted.
 */
function useExternalChange(value: string | null) {
  const [seen, setSeen] = useState(value);
  const [chosen, setChosen] = useState<{ value: string | null } | null>(null);
  const [flash, setFlash] = useState(0);
  if (seen !== value) {
    // Adjusting state while rendering (React's pattern for reacting to a prop change).
    setSeen(value);
    if (chosen && chosen.value === value) setChosen(null);
    else setFlash((count) => count + 1);
  }
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(0), CHANGE_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [flash]);
  return {
    active: flash > 0,
    chose: (next: string | null) => setChosen({ value: next }),
  };
}

interface SwitcherListProps {
  tree: ContextTree;
  items: readonly ContextItem[];
  remote?: ContextSwitcherRemote;
  value: string | null;
  recent: readonly string[];
  /** Display and accessibility labels supplied by the application. */
  labels: SwitcherLabels;
  /** Lead with the "all" row. */
  all: boolean;
  /** The "all" glyph. */
  icon?: ReactNode;
  /** Called with the chosen context id, or null for all, when the person picks a row. */
  onChoose: (value: string | null) => void;
  /** In a sheet (phones) or a page: the list is always shown, without a popup. */
  inline?: boolean;
  /** Inline in a sheet: the panel takes the sheet's insets. */
  placement?: "sheet" | "page";
  open?: boolean;
  /** Called with the next open state when the popup opens or is dismissed; closing clears a local search query. */
  onOpenChange?: (open: boolean) => void;
  /** The popup finished closing (or opening): its animations are done. */
  onOpenChangeComplete?: (open: boolean) => void;
  /** Control that opens the overlay or action. */
  trigger?: ReactNode;
}

/**
 * The searchable list: a popup under the trigger, or inline (the phone sheet, the gallery).
 * Exported as ContextSwitcherPanel for documentation and for pages that pick a scope in place.
 */
function SwitcherList({
  tree,
  items,
  remote,
  value,
  recent,
  labels,
  all,
  icon,
  onChoose,
  inline = false,
  placement = "page",
  open,
  onOpenChange,
  onOpenChangeComplete,
  trigger,
}: SwitcherListProps) {
  const messages = useMessages(contextSwitcherMessages)
 const locale = useLocale()

  const popup = usePopupMetrics();
  const [localQuery, setLocalQuery] = useState("");
  const query = remote?.query ?? localQuery;
  const setQuery = remote?.onQueryChange ?? setLocalQuery;
  const groups = useMemo(
    () =>
      remote
        ? remoteGroups(items, remote, labels, all)
        : switcherGroups(tree, { query, recent, value, labels, all }),
    [tree, query, recent, value, labels, remote, items, all],
  );
  // The selected row is the tree's, never the Recent copy, so it is marked once.
  const selected = useMemo(
    () =>
      groups
        .flatMap((group) => group.items)
        .find((row) => row.value === value && !row.key.startsWith("recent:")) ??
      null,
    [groups, value],
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const count = groups.reduce((total, group) => total + group.items.length, 0);

  const body = (
    <>
      <div className="fa-context-switcher-search">
        <IconSearch />
        <Combobox.Input
          ref={inputRef}
          className="fa-context-switcher-input"
          placeholder={labels.placeholder}
          aria-label={labels.search}
        />
      </div>
      <Combobox.Status className="sr-only">
        {remote
          ? remote.loading
            ? labels.loading
            : remote.error
              ? labels.unavailable
              : messages.loadedResults({ count: items.length, more: remote.hasNextPage, locale: locale })
          : query.trim()
            ? messages.resultCount(count, locale)
            : ""}
      </Combobox.Status>
      {!remote && (
        <Combobox.Empty className="fa-context-switcher-empty">
          {query.trim() ? labels.noMatch(query.trim()) : null}
        </Combobox.Empty>
      )}
      <Combobox.List
        className="fa-context-switcher-list"
        data-inline={inline ? "" : undefined}
      >
        {(group: SwitcherGroup) => (
          <Combobox.Group
            key={group.value || "all"}
            items={group.items}
            className="fa-context-switcher-group"
          >
            {group.value ? (
              <Combobox.GroupLabel className="fa-popup-group-label">
                {group.value}
              </Combobox.GroupLabel>
            ) : null}
            <Combobox.Collection>
              {(row: SwitcherRow) => (
                <SwitcherItem key={row.key} row={row} query={query} icon={icon} />
              )}
            </Combobox.Collection>
          </Combobox.Group>
        )}
      </Combobox.List>
      {remote ? (
        <RemoteFeedback remote={remote} count={items.length} labels={labels} />
      ) : null}
    </>
  );

  return (
    <Combobox.Root
      items={groups}
      filteredItems={groups}
      filter={null}
      value={selected}
      onValueChange={(row) => {
        if (row) onChoose((row as SwitcherRow).value);
      }}
      inputValue={query}
      onInputValueChange={(next) => setQuery(next)}
      itemToStringLabel={(row: SwitcherRow) => row.label}
      itemToStringValue={(row: SwitcherRow) => row.key}
      isItemEqualToValue={(a: SwitcherRow, b: SwitcherRow) => a.key === b.key}
      open={inline ? true : open}
      onOpenChange={(next) => {
        if (!next && !remote) setLocalQuery("");
        onOpenChange?.(next);
      }}
      onOpenChangeComplete={onOpenChangeComplete}
      inline={inline}
      autoHighlight
    >
      {inline ? (
        <div
          className="fa-context-switcher-panel"
          data-inline=""
          data-placement={placement}
        >
          {body}
        </div>
      ) : (
        <>
          {trigger}
          <Combobox.Portal render={<DirectionPortal />} container={popupContainer()}>
            <Combobox.Positioner
              className="fa-select-positioner"
              align="start"
              sideOffset={popup.offset}
              collisionPadding={popup.collisionPadding}
            >
              <Combobox.Popup
                className="glass-overlay fa-popup fa-context-switcher-popup"
                aria-label={labels.popup}
                initialFocus={inputRef}
              >
                {body}
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </>
      )}
    </Combobox.Root>
  );
}

function SwitcherItem({
  row,
  query,
  icon,
}: {
  row: SwitcherRow;
  query: string;
  icon?: ReactNode;
}) {
  return (
    <Combobox.Item
      value={row}
      className="fa-item fa-context-switcher-item"
      data-depth={row.depth || undefined}
      data-kind={row.kind}
      data-two-line={row.detail ? "" : undefined}
      style={
        row.depth ? ({ "--_depth": row.depth } as CSSProperties) : undefined
      }
    >
      <ContextAvatar item={row.item ?? null} icon={icon} size="sm" />
      <span className="fa-context-switcher-text">
        <TruncatedText className="fa-item-label">
          <Highlight text={row.label} query={query} />
        </TruncatedText>
        {row.detail ? (
          <TruncatedText className="fa-context-switcher-detail">
            <Highlight text={row.detail} query={query} />
          </TruncatedText>
        ) : null}
      </span>
      {row.item?.meta ? (
        <span className="fa-item-trail">{row.item.meta}</span>
      ) : null}
      <Combobox.ItemIndicator className="fa-context-switcher-check">
        <IconCheck />
      </Combobox.ItemIndicator>
    </Combobox.Item>
  );
}

export interface ContextSwitcherPanelProps<I extends ContextItem = ContextItem> {
  /** Complete local hierarchy, or the loaded flat server results when remote is supplied. */
  items: readonly I[];
  /** Controlled server search and paging; parent links and local recents are ignored. */
  remote?: ContextSwitcherRemote;
  /** Selected context id, or null for the "all" scope (or none, when `all` is false). */
  value: string | null;
  /** Called with the chosen context id, or null for all, when the person picks a row (also when it is the current one). */
  onValueChange: (value: string | null) => void;
  /** Previously selected ids, ordered most recent first. */
  recent?: readonly string[];
  /** The words it shows and announces; see ContextSwitcher's `labels`. */
  labels?: Partial<SwitcherLabels>;
  /** Offer an "all" row (default true). */
  all?: boolean;
  /** The glyph for the "all" scope (default the organisation glyph). */
  icon?: ReactNode;
}

/** The switcher's list, always open, for a sheet, a page or the gallery. */
export function ContextSwitcherPanel<I extends ContextItem>({
  items,
  remote,
  value,
  onValueChange,
  recent = [],
  labels: labelsProp,
  all = true,
  icon,
}: ContextSwitcherPanelProps<I>) {
  const translated = useMessages(contextSwitcherMessages);
  const labels = useMemo(() => ({ ...translated, ...labelsProp }), [translated, labelsProp]);
  const locale = useLocale();
  const tree = useMemo(() => buildContextTree(items, locale), [items, locale]);
  return (
    <SwitcherList
      tree={tree}
      items={items}
      remote={remote}
      value={value}
      recent={recent}
      labels={labels}
      all={all}
      icon={icon}
      inline
      onChoose={onValueChange}
    />
  );
}
