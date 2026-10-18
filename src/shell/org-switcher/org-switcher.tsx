/**
 * OrgSwitcher — the tenant scope in the top bar (R5.2, R6.9). First after the logo, so the
 * organisation you are in is always visible: its avatar and name, "All organisations" when
 * unscoped, and "+3" when a parent includes its children. The breadcrumb continues from it.
 *
 *   trigger   [avatar] Northstar Studio (+3) ⇅     on the canvas, like a crumb
 *   popup     search · All organisations · Recent · the parent/child tree     (fa-popup)
 *   phone     the same list in a bottom Sheet
 *
 * Behaviour is Base UI's Combobox with the input inside the popup: typing filters, arrows
 * move, Enter chooses, Esc closes, focus returns to the trigger. The switcher only reports a
 * choice (`onValueChange`); the application decides where that goes (keeping your place,
 * R6.6) and owns the URL.
 *
 * Generic: it knows organisations as a tree of { id, name, parentId, avatar }. The product
 * supplies them (a directory adapter) and the labels.
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
import { useMediaQuery } from "../../lib/use-media-query.js";
import {
  POPUP_COLLISION_PADDING,
  POPUP_OFFSET,
} from "../../ui/select/index.js";
import { Sheet } from "../../ui/sheet/index.js";
import { TruncatedText } from "../../ui/truncated-text/index.js";
import { SHELL_QUERIES } from "../queries.js";
import {
  DEFAULT_SWITCHER_LABELS,
  buildOrgTree,
  orgCode,
  orgInitials,
  orgTint,
  switcherGroups,
  type OrgTree,
  type SwitcherGroup,
  type SwitcherLabels,
  type SwitcherOrganisation,
  type SwitcherRow,
} from "./model.js";
import {
  RemoteFeedback,
  remoteGroups,
  type OrgSwitcherRemote,
} from "./remote.js";

/* ── Avatar ─────────────────────────────────────────────────────────────── */

export type OrgAvatarSize = "xs" | "sm" | "md" | "lg";

export interface OrgAvatarProps extends Omit<
  ComponentProps<"span">,
  "children"
> {
  /** The organisation, or null for "All organisations". */
  org: Pick<
    SwitcherOrganisation,
    "id" | "name" | "avatarSrc" | "initials" | "tint"
  > | null;
  /** xs 20 (lists, chips) · sm 24 (top bar, dock) · md 32 · lg 40 (page headers). */
  size?: OrgAvatarSize;
  /** Hidden from assistive tech (default): a visible name sits beside it. */
  decorative?: boolean;
}

/**
 * An organisation's avatar: its logo, or its initials on its tint. A rounded square, so an
 * organisation never reads as a person (people are round, ui/avatar). All organisations is
 * the organisation glyph on a neutral tile.
 */
export function OrgAvatar({
  org,
  size = "sm",
  decorative = true,
  className,
  ...rest
}: OrgAvatarProps) {
  return (
    <span
      {...rest}
      className={cx("fa-org-avatar", className)}
      data-size={size}
      data-tint={org ? orgTint(org) : "all"}
      data-logo={org?.avatarSrc ? "" : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : (org?.name ?? "All organisations")}
      aria-hidden={decorative ? true : undefined}
    >
      {org === null ? (
        <IconOrganisation />
      ) : org.avatarSrc ? (
        <img
          className="fa-org-avatar-image"
          src={org.avatarSrc}
          alt=""
          draggable={false}
        />
      ) : (
        <span className="fa-org-avatar-initials">
          {org.initials ?? orgInitials(org.name)}
        </span>
      )}
    </span>
  );
}

/* ── Switcher ───────────────────────────────────────────────────────────── */

export interface OrgSwitcherProps<
  O extends SwitcherOrganisation = SwitcherOrganisation,
> {
  /** Complete local hierarchy, or the loaded flat server results when remote is supplied. */
  organisations: readonly O[];
  /** Controlled server search/paging. Bypasses local filtering and ignores parent links and recents. */
  remote?: OrgSwitcherRemote;
  /** The current scope: an organisation id, or null for all organisations. */
  value: string | null;
  /** A choice was made (also when it is the current one: the caller may ignore it). */
  onValueChange: (value: string | null) => void;
  /** Recently chosen organisation ids, most recent first (useRecentOrganisations). */
  recent?: readonly string[];
  /** Controlled open state, so a palette command or a shortcut can open it. */
  open?: boolean;
  /** Called with the next open state when the popup (or phone sheet) opens or closes, including the close after a choice. Pair with `open` to control it. */
  onOpenChange?: (open: boolean) => void;
  /** Display and accessibility labels supplied by the application. */
  labels?: Partial<SwitcherLabels>;
  /** Placeholder of the search field. */
  searchPlaceholder?: string;
  className?: string;
}

/** The trigger's text: "Northstar Studio" and how many it includes. */
export function describeOrgScope(
  tree: OrgTree,
  value: string | null,
  labels: SwitcherLabels = DEFAULT_SWITCHER_LABELS,
) {
  const org = value ? tree.byId.get(value) : undefined;
  const includes = org ? tree.descendantsOf(org.id).length : 0;
  const name = org?.name ?? labels.all;
  const code = org ? orgCode(org) : labels.allShort;
  const accessible = includes
    ? `${name} and ${includes} ${includes === 1 ? "organisation" : "organisations"} under it`
    : name;
  return { org: org ?? null, name, code, includes, accessible };
}

/** Choose an organisation from a complete local hierarchy or a bounded server directory. */
export function OrgSwitcher<O extends SwitcherOrganisation>({
  organisations,
  remote,
  value,
  onValueChange,
  recent = [],
  open: openProp,
  onOpenChange,
  labels: labelsProp,
  searchPlaceholder = "Find an organisation",
  className,
}: OrgSwitcherProps<O>) {
  const labels = useMemo(
    () => ({ ...DEFAULT_SWITCHER_LABELS, ...labelsProp }),
    [labelsProp],
  );
  const tree = useMemo(() => buildOrgTree(organisations), [organisations]);
  const phone = useMediaQuery(SHELL_QUERIES.phone);
  const [innerOpen, setInnerOpen] = useState(false);
  const open = openProp ?? innerOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  };
  const selectedOrg =
    value === null
      ? undefined
      : remote?.selected?.id === value
        ? remote.selected
        : tree.byId.get(value);
  const scope =
    remote && value !== null
      ? {
          org: selectedOrg ?? null,
          name: selectedOrg?.name ?? "Organisation unavailable",
          code: selectedOrg ? orgCode(selectedOrg) : "?",
          includes: 0,
          accessible: selectedOrg?.name ?? "Organisation unavailable",
        }
      : describeOrgScope(tree, value, labels);
  const changed = useExternalChange(value);
  const fresh = useFreshAfterClose();

  const trigger = (
    <span className="fa-org-switcher-face">
      <OrgAvatar org={scope.org} size="sm" />
      <TruncatedText className="fa-org-switcher-name" tooltipSide="bottom">
        {scope.name}
      </TruncatedText>
      {/* A narrow bar shows the short code instead of the name (top-bar.css). */}
      <span className="fa-org-switcher-code" aria-hidden>
        {scope.code}
      </span>
      {scope.includes ? (
        <span className="fa-org-switcher-includes" aria-hidden>
          +{scope.includes}
        </span>
      ) : null}
      <IconChevronsUpDown className="fa-org-switcher-chevron" />
    </span>
  );
  const triggerProps = {
    ref: fresh.triggerRef,
    className: cx("fa-org-switcher fa-pressable", className),
    "aria-label": `Organisation: ${scope.accessible}`,
    "data-scope": value ?? "all",
    "data-changed": changed.active ? "" : undefined,
  };
  const choose = (next: string | null) => {
    setOpen(false);
    changed.chose(next);
    onValueChange(next);
  };
  // Said once when the scope changes from elsewhere (a search result in another organisation).
  // The status node stays mounted so the message is announced when its text arrives.
  const announcement = (
    <span className="sr-only" role="status">
      {changed.active ? `Now in ${scope.name}` : ""}
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
            <Sheet.Header title="Organisation" />
            {/* Straight in the sheet, not in a Sheet.Body: the search stays put and the list scrolls. */}
            <SwitcherList
              tree={tree}
              organisations={organisations}
              remote={remote}
              value={value}
              recent={recent}
              labels={labels}
              placeholder={searchPlaceholder}
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
        organisations={organisations}
        remote={remote}
        value={value}
        recent={recent}
        labels={labels}
        placeholder={searchPlaceholder}
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
 * (about 400 detached nodes and 46 listeners per organisation switch, docs/performance.md).
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
      Boolean(active?.closest(".fa-org-switcher-popup"));
    setGeneration((current) => current + 1);
  };
  return { generation, triggerRef, onOpenChangeComplete };
}

/** How long the trigger stays highlighted after the scope changes from elsewhere. */
const CHANGE_HIGHLIGHT_MS = 1600;

/**
 * Notices a scope change that did not come from this switcher (a search result or a link in
 * another organisation, Back and Forward), so the trigger can highlight it briefly (R6.9):
 * the user is told the organisation changed under them. A choice made in the switcher is
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
  tree: OrgTree;
  organisations: readonly SwitcherOrganisation[];
  remote?: OrgSwitcherRemote;
  value: string | null;
  recent: readonly string[];
  /** Display and accessibility labels supplied by the application. */
  labels: SwitcherLabels;
  placeholder: string;
  /** Called with the chosen organisation id, or null for all organisations, when the person picks a row. */
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
 * Exported as OrgSwitcherPanel for documentation and for pages that pick a scope in place.
 */
function SwitcherList({
  tree,
  organisations,
  remote,
  value,
  recent,
  labels,
  placeholder,
  onChoose,
  inline = false,
  placement = "page",
  open,
  onOpenChange,
  onOpenChangeComplete,
  trigger,
}: SwitcherListProps) {
  const [localQuery, setLocalQuery] = useState("");
  const query = remote?.query ?? localQuery;
  const setQuery = remote?.onQueryChange ?? setLocalQuery;
  const groups = useMemo(
    () =>
      remote
        ? remoteGroups(organisations, remote, labels)
        : switcherGroups(tree, { query, recent, value, labels }),
    [tree, query, recent, value, labels, remote, organisations],
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
      <div className="fa-org-switcher-search">
        <IconSearch />
        <Combobox.Input
          ref={inputRef}
          className="fa-org-switcher-input"
          placeholder={placeholder}
          aria-label="Search organisations"
        />
      </div>
      <Combobox.Status className="sr-only">
        {remote
          ? remote.loading
            ? "Loading organisations"
            : remote.error
              ? "Organisation directory unavailable"
              : `${organisations.length} loaded ${organisations.length === 1 ? "result" : "results"}${remote.hasNextPage ? "; more available" : ""}`
          : query.trim()
            ? `${count} ${count === 1 ? "result" : "results"}`
            : ""}
      </Combobox.Status>
      {!remote && (
        <Combobox.Empty className="fa-org-switcher-empty">
          {query.trim() ? `No organisations match “${query.trim()}”` : null}
        </Combobox.Empty>
      )}
      <Combobox.List
        className="fa-org-switcher-list"
        data-inline={inline ? "" : undefined}
      >
        {(group: SwitcherGroup) => (
          <Combobox.Group
            key={group.value || "all"}
            items={group.items}
            className="fa-org-switcher-group"
          >
            {group.value ? (
              <Combobox.GroupLabel className="fa-popup-group-label">
                {group.value}
              </Combobox.GroupLabel>
            ) : null}
            <Combobox.Collection>
              {(row: SwitcherRow) => (
                <SwitcherItem key={row.key} row={row} query={query} />
              )}
            </Combobox.Collection>
          </Combobox.Group>
        )}
      </Combobox.List>
      {remote ? (
        <RemoteFeedback remote={remote} count={organisations.length} />
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
          className="fa-org-switcher-panel"
          data-inline=""
          data-placement={placement}
        >
          {body}
        </div>
      ) : (
        <>
          {trigger}
          <Combobox.Portal>
            <Combobox.Positioner
              className="fa-select-positioner"
              align="start"
              sideOffset={POPUP_OFFSET}
              collisionPadding={POPUP_COLLISION_PADDING}
            >
              <Combobox.Popup
                className="glass-overlay fa-popup fa-org-switcher-popup"
                aria-label="Choose an organisation"
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

function SwitcherItem({ row, query }: { row: SwitcherRow; query: string }) {
  return (
    <Combobox.Item
      value={row}
      className="fa-item fa-org-switcher-item"
      data-depth={row.depth || undefined}
      data-kind={row.kind}
      data-two-line={row.detail ? "" : undefined}
      style={
        row.depth ? ({ "--_depth": row.depth } as CSSProperties) : undefined
      }
    >
      <OrgAvatar org={row.org ?? null} size="sm" />
      <span className="fa-org-switcher-text">
        <TruncatedText className="fa-item-label">
          <Highlight text={row.label} query={query} />
        </TruncatedText>
        {row.detail ? (
          <TruncatedText className="fa-org-switcher-detail">
            <Highlight text={row.detail} query={query} />
          </TruncatedText>
        ) : null}
      </span>
      {row.org?.meta ? (
        <span className="fa-item-trail">{row.org.meta}</span>
      ) : null}
      <Combobox.ItemIndicator className="fa-org-switcher-check">
        <IconCheck />
      </Combobox.ItemIndicator>
    </Combobox.Item>
  );
}

export interface OrgSwitcherPanelProps<
  O extends SwitcherOrganisation = SwitcherOrganisation,
> {
  /** Complete local hierarchy, or the loaded flat server results when remote is supplied. */
  organisations: readonly O[];
  /** Controlled server search and paging; parent links and local recents are ignored. */
  remote?: OrgSwitcherRemote;
  /** Selected organisation ID, or null for the all-organisations scope. */
  value: string | null;
  /** Called with the chosen organisation id, or null for all organisations, when the person picks a row (also when it is the current one). */
  onValueChange: (value: string | null) => void;
  /** Previously selected IDs, ordered most recent first. */
  recent?: readonly string[];
  /** Display and accessibility labels supplied by the application. */
  labels?: Partial<SwitcherLabels>;
  /** Prompt in the searchable hierarchy. Defaults to "Find an organisation". */
  searchPlaceholder?: string;
}

/** The switcher's list, always open, for a sheet, a page or the gallery. */
export function OrgSwitcherPanel<O extends SwitcherOrganisation>({
  organisations,
  remote,
  value,
  onValueChange,
  recent = [],
  labels: labelsProp,
  searchPlaceholder = "Find an organisation",
}: OrgSwitcherPanelProps<O>) {
  const labels = useMemo(
    () => ({ ...DEFAULT_SWITCHER_LABELS, ...labelsProp }),
    [labelsProp],
  );
  const tree = useMemo(() => buildOrgTree(organisations), [organisations]);
  return (
    <SwitcherList
      tree={tree}
      organisations={organisations}
      remote={remote}
      value={value}
      recent={recent}
      labels={labels}
      placeholder={searchPlaceholder}
      inline
      onChoose={onValueChange}
    />
  );
}
