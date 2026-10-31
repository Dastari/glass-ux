import { useMessages } from "../lib/i18n/index.js"
import { shellMessages } from "./messages.js"
/**
 * SectionDrawer — the current section's navigation and lists (Assistant conversations,
 * the organisation and endpoint tree, ticket views), in a glass pane beside the rail.
 *
 *   Header  section mark, title, actions, collapse toggle
 *   Search  optional filter field; stays put while the list scrolls
 *   Body    scrolls; the header edge appears while content passes beneath it (R5.8)
 *   Footer  pinned items (section settings)
 *
 * The parts are Sidebar's (glass-ux/sidebar), under the drawer's own class names and
 * geometry: Search is Sidebar.Search, Body is Sidebar.Content, Item is Sidebar.MenuButton in
 * a Sidebar.MenuItem, Group is a collapsible Sidebar.Group, Match is Sidebar.Match. The
 * AppShell docks the drawer (resizable, collapsible to the rail) on desktops and shows it as
 * a slide-over sheet on tablets and phones, driving it with Sidebar's state. Width, open
 * state and collapsed groups persist (shell-state.ts).
 */
import {
  useCallback,
  useContext,
  createContext,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { IconSidebar } from "../icons/generated/icons.js";
import { cx } from "../lib/cx.js";
import { Button } from "../ui/button/index.js";
import { useAriaShortcut } from "../ui/kbd/index.js";
import { Sheet } from "../ui/sheet/index.js";
import { Sidebar } from "../ui/sidebar/sidebar.js";
import {
  SidebarConfig,
  SidebarContext,
  SidebarIconMode,
  SidebarPartClasses,
  SidebarPlacement,
  detachedSidebar,
  type SidebarConfigValue,
  type SidebarInternal,
  type SidebarPartClassNames,
} from "../ui/sidebar/context.js";
import { DrawerPlacement, ShellSidebarContext, useOptionalShell } from "./app-shell.js";
import { updateShellPrefs, useShellPrefs } from "./shell-state.js";

/** The drawer's names for the inner parts of Sidebar's parts (its styling hooks). */
const DRAWER_CLASSES: SidebarPartClassNames = {
  groupTrigger: "fa-shell-drawer-group-trigger",
  chevron: "fa-shell-drawer-chevron",
  text: "fa-shell-drawer-text",
  label: "fa-item-label",
  detail: "fa-shell-drawer-detail",
  face: "fa-shell-drawer-face",
  mark: "fa-shell-drawer-mark",
  titleBlock: "fa-shell-drawer-heading",
  subtitle: "fa-shell-drawer-subtitle",
};

const noRef = { current: null };

/** One detached Sidebar state for every drawer that stands alone (made on first use). */
let detached: SidebarInternal | null = null;

/** The placement the parts below were scoped for, or null outside a drawer. */
const DrawerScope = /* @__PURE__ */ createContext<"pane" | "sheet" | null>(null);

/**
 * Gives Sidebar's parts what they read from a Sidebar: the shell's drawer state (or a
 * detached one when the drawer stands alone, as in a host's own layout or dialog), the
 * placement, and the drawer's class names. Root provides it once; a part used without Root
 * (a host's dialog under DrawerPlacement "sheet") provides its own.
 */
function Scope({ label = "", children }: { label?: string | undefined; children: ReactNode }) {
  const scoped = useContext(DrawerScope);
  const placement = useContext(DrawerPlacement);
  const shellSidebar = useContext(ShellSidebarContext);
  if (scoped === placement) return <>{children}</>;
  const config: SidebarConfigValue = { side: "start", collapsible: "offcanvas", resizable: false, min: 14, max: 28, rootRef: noRef, paneRef: noRef, label };
  return (
    <DrawerScope.Provider value={placement}>
      <SidebarContext.Provider value={shellSidebar ?? (detached ??= detachedSidebar())}>
        <SidebarPlacement.Provider value={placement}>
          <SidebarIconMode.Provider value={false}>
            <SidebarConfig.Provider value={config}>
              <SidebarPartClasses.Provider value={DRAWER_CLASSES}>{children}</SidebarPartClasses.Provider>
            </SidebarConfig.Provider>
          </SidebarIconMode.Provider>
        </SidebarPlacement.Provider>
      </SidebarContext.Provider>
    </DrawerScope.Provider>
  );
}

export interface SectionDrawerProps extends ComponentProps<"nav"> {
  /** Accessible name: "Assistant navigation". */
  "aria-label": string;
}

function Root({ className, children, ...rest }: SectionDrawerProps) {
  const placement = useContext(DrawerPlacement);
  // In a sheet the Sheet is the surface (and is labelled by the shell): parts map onto it.
  if (placement === "sheet") return <Scope label={rest["aria-label"]}>{children}</Scope>;
  return (
    <Scope label={rest["aria-label"]}>
      <nav
        {...rest}
        className={cx("glass-panel fa-shell-drawer", className)}
        data-placement={placement}
        data-sidebar-surface=""
      >
        {children}
      </nav>
    </Scope>
  );
}

export interface SectionDrawerHeaderProps extends Omit<
  ComponentProps<"header">,
  "title"
> {
  /** The section's mark or icon. */
  icon?: ReactNode;
  title: ReactNode;
  /** Data only, on a second line under the title: a version, a workspace identifier (R2.2). */
  subtitle?: ReactNode;
  /** Supporting actions rendered in the action slot. */
  actions?: ReactNode;
}

function Header({
  icon,
  title,
  subtitle,
  actions,
  className,
  ...rest
}: SectionDrawerHeaderProps) {
  const messages = useMessages(shellMessages)

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
        subtitle={subtitle}
      >
        {actions}
      </Sheet.Header>
    );
  }
  const collapse = shell ? (
    <Button
      variant="ghost"
      size="sm"
      icon={<IconSidebar />}
      aria-label={messages.collapseSectionNavigation}
      shortcut={shell.drawerShortcut}
      aria-keyshortcuts={drawerKeys}
      onClick={() => shell.setDrawerOpen(false)}
    />
  ) : null;
  return (
    <Scope>
      <Sidebar.Header
        {...(rest as ComponentProps<"div">)}
        className={cx("fa-shell-drawer-header", className)}
        icon={icon}
        title={<h2 className="fa-shell-drawer-title">{title}</h2>}
        subtitle={subtitle}
        toggle={false}
        actions={actions || collapse ? <>{actions}{collapse}</> : undefined}
      />
    </Scope>
  );
}

export interface SectionDrawerSearchProps {
  value: string;
  /** Called with the new query as the person types, and with "" when Esc clears the field. Pair with `value`. */
  onValueChange: (value: string) => void;
  /** What the list holds, plural: "organisations" names the field "Search organisations". */
  noun: string;
  placeholder?: string;
}

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
  const messages = useMessages(shellMessages)
  return (
    <Scope>
      <Sidebar.Search
        className="fa-shell-drawer-search"
        value={value}
        onValueChange={onValueChange}
        aria-label={messages.search(noun)}
        placeholder={placeholder ?? messages.search(noun)}
      />
    </Scope>
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
  return <Sidebar.Match text={text} query={query} />;
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
  if (placement === "sheet") {
    // The sheet's body scrolls; the drawer's body only lays the content out inside it.
    return (
      <Sheet.Body>
        <div
          {...rest}
          className={cx("fa-shell-drawer-body", className)}
          data-placement="sheet"
          data-fill={fill ? "" : undefined}
          data-sidebar-content=""
        >
          {children}
        </div>
      </Sheet.Body>
    );
  }
  return (
    <Scope>
      <Sidebar.Content {...rest} fill={fill} className={cx("fa-shell-drawer-body", className)}>
        {children}
      </Sidebar.Content>
    </Scope>
  );
}

/**
 * Dismiss the drawer after choosing a destination inside custom drawer content (a Tree):
 * closes the slide-over sheet on tablets and phones, and does nothing where it is docked.
 */
export function useDrawerDismiss() {
  const sidebar = useContext(ShellSidebarContext);
  const placement = useContext(DrawerPlacement);
  return useCallback(() => {
    if (placement === "sheet") sidebar?.changeMobile(false, "navigation");
  }, [placement, sidebar]);
}

function Footer({ className, ...rest }: ComponentProps<"div">) {
  const placement = useContext(DrawerPlacement);
  const footer = (
    <Sidebar.Footer
      {...rest}
      className={cx("fa-shell-drawer-footer", className)}
      data-placement={placement}
    />
  );
  return placement === "sheet" ? <Sheet.Footer>{footer}</Sheet.Footer> : footer;
}

/** A list of items. */
function List({ className, ...rest }: ComponentProps<"ul">) {
  return <Sidebar.Menu {...rest} className={cx("fa-shell-drawer-list", className)} />;
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
  ...rest
}: SectionDrawerItemProps) {
  // A button unless rendered as a router link (`href` alone keeps it a button, as before).
  return (
    <Scope>
      <Sidebar.MenuItem className="fa-shell-drawer-entry">
        <Sidebar.MenuButton
          {...(rest as Omit<ComponentProps<"button">, "children">)}
          render={render ?? <button />}
          icon={icon}
          detail={detail}
          face={face}
          count={count}
          active={active}
          className={cx("fa-shell-drawer-item", className)}
        >
          {label}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Scope>
  );
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
    <Scope>
      <Sidebar.Group
        collapsible
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
          <Sidebar.GroupLabel count={count}>{title}</Sidebar.GroupLabel>
          {actions}
        </div>
        <Sidebar.GroupContent className="fa-shell-drawer-group-panel">
          {children}
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </Scope>
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
