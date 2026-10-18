import { Highlight } from "../ui/combobox/index.js";
/**
 * SectionDrawer — the current section's navigation and lists (Assistant conversations,
 * the organisation and endpoint tree, ticket views), in a glass pane beside the rail.
 *
 *   Header  section mark, title, actions, collapse toggle
 *   Search  optional filter field; stays put while the list scrolls
 *   Body    scrolls; the header edge appears while content passes beneath it (R5.8)
 *   Footer  pinned items (section settings)
 *
 * The AppShell docks it (resizable, collapsible to the rail) on desktops and shows it as
 * a slide-over sheet on tablets and phones. Width, open state and collapsed groups
 * persist (shell-state.ts).
 */
import { Collapsible } from "@base-ui/react/collapsible";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { IconChevronDown, IconSidebar } from "../icons/generated/icons.js";
import { cx } from "../lib/cx.js";
import { useScrollEdges } from "../lib/use-scroll-edges.js";
import { CountBadge } from "../ui/badge/index.js";
import { Button } from "../ui/button/index.js";
import { SearchField } from "../ui/input/index.js";
import {
  matchesShortcut,
  useAriaShortcut,
  usePlatform,
} from "../ui/kbd/index.js";
import { Sheet } from "../ui/sheet/index.js";
import { DrawerPlacement, useOptionalShell } from "./app-shell.js";
import { updateShellPrefs, useShellPrefs } from "./shell-state.js";

export interface SectionDrawerProps extends ComponentProps<"nav"> {
  /** Accessible name: "Assistant navigation". */
  "aria-label": string;
}

function Root({ className, children, ...rest }: SectionDrawerProps) {
  const placement = useContext(DrawerPlacement);
  // In a sheet the Sheet is the surface (and is labelled by the shell): parts map onto it.
  if (placement === "sheet") return <>{children}</>;
  return (
    <nav
      {...rest}
      className={cx("glass-panel fa-shell-drawer", className)}
      data-placement={placement}
    >
      {children}
    </nav>
  );
}

export interface SectionDrawerHeaderProps extends Omit<
  ComponentProps<"header">,
  "title"
> {
  /** The section's mark or icon. */
  icon?: ReactNode;
  title: ReactNode;
  /** Supporting actions rendered in the action slot. */
  actions?: ReactNode;
}

function Header({
  icon,
  title,
  actions,
  className,
  ...rest
}: SectionDrawerHeaderProps) {
  const shell = useOptionalShell();
  const placement = useContext(DrawerPlacement);
  const drawerKeys = useAriaShortcut(shell?.drawerShortcut);
  if (placement === "sheet") {
    return (
      <Sheet.Header
        icon={
          icon ? (
            <span className="fa-shell-drawer-mark">{icon}</span>
          ) : undefined
        }
        title={title}
      >
        {actions}
      </Sheet.Header>
    );
  }
  return (
    <header {...rest} className={cx("fa-shell-drawer-header", className)}>
      {icon ? <span className="fa-shell-drawer-mark">{icon}</span> : null}
      <h2 className="fa-shell-drawer-title">{title}</h2>
      {actions}
      {shell ? (
        <Button
          variant="ghost"
          size="sm"
          icon={<IconSidebar />}
          aria-label="Collapse section navigation"
          shortcut={shell.drawerShortcut}
          aria-keyshortcuts={drawerKeys}
          onClick={() => shell.setDrawerOpen(false)}
        />
      ) : null}
    </header>
  );
}

export interface SectionDrawerSearchProps {
  value: string;
  /** Called when value change occurs. The callback type specifies its arguments. */
  onValueChange: (value: string) => void;
  /** What the list holds, plural: "organisations" names the field "Search organisations". */
  noun: string;
  placeholder?: string;
}

/** The drawer's surface: the docked pane, or the sheet it becomes on tablets and phones. */
const SURFACE = ".fa-shell-drawer, .fa-dialog";
/** Rows the keyboard walks from the search field: list items, then a Tree's rows. */
const ROWS =
  ".fa-shell-drawer-body :is(.fa-shell-drawer-item, [role='treeitem'])";
const SHORTCUTS = ["/", "mod+f"];

const editable = (element: Element) =>
  Boolean(element.closest("input, textarea, select, [contenteditable='true']"));
/** A Tree's first row (level 1, first in its set): ↑ from it leaves the tree. */
const firstTreeRow = (element: Element) =>
  element.getAttribute("aria-level") === "1" &&
  element.getAttribute("aria-posinset") === "1";

/**
 * The list's filter, between the header and the body: it stays put while the list scrolls.
 * The query is the host's (local state): it filters its own list, or hands it to a Tree's
 * `query`, and highlights the match (SectionDrawer.Match, or the Tree's own highlight).
 *
 * Keyboard, while focus is anywhere in the drawer: / or ⌘F / Ctrl F focuses the field
 * (⌘F inside the field is the browser's find again). ↓ from the field enters the list, and
 * ↑ / ↓ walk its items and on into a Tree, whose own keys then apply; ↑ from the first row
 * returns to the field. Esc clears the field, and Esc again returns focus to where it was.
 */
function Search({
  value,
  onValueChange,
  noun,
  placeholder,
}: SectionDrawerSearchProps) {
  const placement = useContext(DrawerPlacement);
  const platform = usePlatform();
  const slash = useAriaShortcut("/");
  const find = useAriaShortcut("mod+f");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Where focus was before it came to the field: Esc on an empty field goes back. */
  const returnTo = useRef<HTMLElement | null>(null);

  const surface = () => wrapRef.current?.closest<HTMLElement>(SURFACE) ?? null;
  const rows = () => [
    ...(surface()?.querySelectorAll<HTMLElement>(ROWS) ?? []),
  ];
  const focusField = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  useEffect(() => {
    const root = wrapRef.current?.closest<HTMLElement>(SURFACE);
    if (!root) return;
    // Capture, so it runs before a Tree's own keys (its typeahead would take "/").
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      if (
        !(target instanceof HTMLElement) ||
        target === inputRef.current ||
        event.defaultPrevented
      )
        return;
      const shortcut = SHORTCUTS.find((keys) =>
        matchesShortcut(event, keys, platform),
      );
      if (shortcut && (shortcut !== "/" || !editable(target))) {
        event.preventDefault();
        event.stopPropagation();
        focusField();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      const tree = target.getAttribute("role") === "treeitem";
      // Inside a Tree only ↑ from its first row is ours; the Tree moves on its own.
      if (tree && !(event.key === "ArrowUp" && firstTreeRow(target))) return;
      if (!tree && !target.matches(".fa-shell-drawer-item")) return;
      const all = rows().filter(
        (row) =>
          row.getAttribute("role") !== "treeitem" ||
          row === target ||
          firstTreeRow(row),
      );
      const index = all.indexOf(target);
      if (index < 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "ArrowUp")
        (index === 0 ? inputRef.current : all[index - 1])?.focus();
      else all[index + 1]?.focus();
    };
    root.addEventListener("keydown", onKeyDown, true);
    return () => root.removeEventListener("keydown", onKeyDown, true);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the helpers read refs only
  }, [platform]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && !event.altKey) {
      const first = rows()[0];
      if (!first) return;
      event.preventDefault();
      first.focus();
      return;
    }
    // A filled field clears itself (SearchField); an empty one hands focus back.
    if (event.key !== "Escape" || event.currentTarget.value !== "") return;
    const root = surface();
    const back = returnTo.current;
    const target =
      back?.isConnected && root?.contains(back)
        ? back
        : (root?.querySelector<HTMLElement>(
            ".fa-shell-drawer-body :is([aria-current='page'], [aria-selected='true'], [role='treeitem'][tabindex='0'])",
          ) ?? rows()[0]);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    returnTo.current = null;
    target.focus();
  };

  const change = (next: string) => {
    onValueChange(next);
    // A new query starts at the top of the list.
    const root = surface();
    root
      ?.querySelector<HTMLElement>(
        ".fa-shell-drawer-body[data-scroll-container]",
      )
      ?.scrollTo({ top: 0 });
    root
      ?.querySelector<HTMLElement>(".fa-shell-drawer-body")
      ?.closest<HTMLElement>(".fa-dialog-body")
      ?.scrollTo({ top: 0 });
  };

  return (
    <div
      ref={wrapRef}
      className="fa-shell-drawer-search"
      data-placement={placement}
    >
      <SearchField
        ref={inputRef}
        size="sm"
        value={value}
        onValueChange={change}
        placeholder={placeholder ?? `Search ${noun}`}
        aria-label={`Search ${noun}`}
        shortcut="/"
        aria-keyshortcuts={[slash, find].filter(Boolean).join(" ")}
        onKeyDown={onKeyDown}
        onFocus={(event) => {
          const from = event.relatedTarget;
          returnTo.current =
            from instanceof HTMLElement &&
            surface()?.contains(from) &&
            !wrapRef.current?.contains(from)
              ? from
              : null;
        }}
      />
    </div>
  );
}

export interface SectionDrawerMatchProps {
  /** Plain text rendered or copied by the component. */
  text: string;
  /** The search: its first occurrence in `text` is highlighted, ignoring case. */
  query: string;
}

/** A row's text with the search highlighted, as a Tree highlights its rows. */
function Match({ text, query }: SectionDrawerMatchProps) {
  return <Highlight text={text} query={query} />;
}

export interface SectionDrawerBodyProps extends ComponentProps<"div"> {
  /**
   * The body does not scroll; its last child fills the remaining height and scrolls itself
   * (a virtualised Tree), so the drawer never shows two scrollbars.
   */
  fill?: boolean;
}

function Body({
  fill = false,
  className,
  children,
  ...rest
}: SectionDrawerBodyProps) {
  const placement = useContext(DrawerPlacement);
  const ref = useRef<HTMLDivElement>(null);
  // The drawer root mirrors the edges, so its header, search and footer select on it.
  const edges = useScrollEdges(ref, { root: ".fa-shell-drawer" });
  if (placement === "sheet") {
    return (
      <Sheet.Body>
        <div
          {...rest}
          className={cx("fa-shell-drawer-body", className)}
          data-placement="sheet"
          data-fill={fill ? "" : undefined}
        >
          {children}
        </div>
      </Sheet.Body>
    );
  }
  return (
    <div
      ref={ref}
      {...rest}
      className={cx("fa-shell-drawer-body", className)}
      data-fill={fill ? "" : undefined}
      data-scroll-container={fill ? undefined : ""}
      data-scrolled-top={edges.top ? "" : undefined}
      data-scrolled-bottom={edges.bottom ? "" : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Dismiss the drawer after choosing a destination inside custom drawer content (a Tree):
 * closes the slide-over sheet on tablets and phones, and does nothing where it is docked.
 */
export function useDrawerDismiss() {
  const shell = useOptionalShell();
  const placement = useContext(DrawerPlacement);
  return useCallback(() => {
    if (placement === "sheet") shell?.setDrawerOpen(false);
  }, [placement, shell]);
}

function Footer({ className, ...rest }: ComponentProps<"div">) {
  const placement = useContext(DrawerPlacement);
  const footer = (
    <div
      {...rest}
      className={cx("fa-shell-drawer-footer", className)}
      data-placement={placement}
    />
  );
  return placement === "sheet" ? <Sheet.Footer>{footer}</Sheet.Footer> : footer;
}

/** A list of items. */
function List({ className, ...rest }: ComponentProps<"ul">) {
  return <ul {...rest} className={cx("fa-shell-drawer-list", className)} />;
}

export interface SectionDrawerItemProps extends Omit<
  ComponentProps<"a">,
  "children"
> {
  icon?: ReactNode;
  label: ReactNode;
  /** Tabular count at the trailing edge. */
  count?: number;
  /** Data subtitle under the label (a user, a path). */
  detail?: ReactNode;
  /** Marks the current destination or active choice. */
  active?: boolean;
  /** Render as a router link: render={<Link to="…" />}. Default: a button. */
  render?: ReactElement;
  /**
   * The row's face, drawn instead of icon, label and detail: an entity identity at its row
   * tier (OrganisationIdentity, DeviceIdentity), so the drawer shows the entity exactly as a
   * table does. `label` stays its plain name.
   */
  face?: ReactNode;
}

function Item({
  icon,
  label,
  count,
  detail,
  active = false,
  render,
  face,
  className,
  onClick,
  ...rest
}: SectionDrawerItemProps) {
  const shell = useOptionalShell();
  const placement = useContext(DrawerPlacement);
  const element = useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"a">(
      {
        className: cx("fa-item fa-shell-drawer-item", className),
        "aria-current": active ? "page" : undefined,
        onClick: (event: MouseEvent<HTMLAnchorElement>) => {
          onClick?.(event);
          // Choosing a destination in the slide-over sheet dismisses it.
          if (placement === "sheet" && !event.defaultPrevented)
            shell?.setDrawerOpen(false);
        },
        children: (
          <>
            {face ? (
              <span className="fa-shell-drawer-face">{face}</span>
            ) : (
              <>
                {icon}
                <span className="fa-shell-drawer-text">
                  <span className="fa-item-label">{label}</span>
                  {detail ? (
                    <span className="fa-shell-drawer-detail">{detail}</span>
                  ) : null}
                </span>
              </>
            )}
            {count !== undefined ? (
              <span className="fa-item-trail">
                {count.toLocaleString("en-AU")}
              </span>
            ) : null}
          </>
        ),
      },
      {
        ...rest,
        "data-active": active ? "" : undefined,
        "data-detail": detail || face ? "" : undefined,
      } as ComponentProps<"a">,
    ),
  });
  return <li className="fa-shell-drawer-entry">{element}</li>;
}

export interface SectionDrawerGroupProps {
  /** Persisted collapsed state key, e.g. "ai.projects". */
  id: string;
  title: string;
  /** Item count shown by the component. */
  count?: number;
  /** Supporting actions rendered in the action slot. */
  actions?: ReactNode;
  children: ReactNode;
}

/** A titled, collapsible group (overline label). Its open state persists. */
function Group({
  id,
  title,
  count,
  actions,
  children,
}: SectionDrawerGroupProps) {
  const prefs = useShellPrefs();
  const open = !prefs.collapsed[id];
  return (
    <Collapsible.Root
      className="fa-shell-drawer-group"
      open={open}
      onOpenChange={(next) =>
        updateShellPrefs((current) => {
          const collapsed = { ...current.collapsed };
          if (next) delete collapsed[id];
          else collapsed[id] = true;
          return { collapsed };
        })
      }
    >
      <div className="fa-shell-drawer-group-head">
        <Collapsible.Trigger className="fa-shell-drawer-group-trigger fa-pressable">
          <span className="fa-overline">{title}</span>
          {count !== undefined ? <CountBadge value={count} /> : null}
          <IconChevronDown className="fa-shell-drawer-chevron" />
        </Collapsible.Trigger>
        {actions}
      </div>
      <Collapsible.Panel className="fa-collapse fa-shell-drawer-group-panel">
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

/** Compose a section navigation drawer with header, search, groups, items, body and footer slots. */
export const SectionDrawer = {
  Root,
  Header,
  Search,
  Match,
  Body,
  Footer,
  List,
  Item,
  Group,
};
