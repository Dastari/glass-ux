import { ToneDot } from "../ui/tone-dot/index.js";
import { TruncatedText } from "../ui/truncated-text/index.js";
/**
 * TopBar — the application context, on the canvas, not in glass (R5.2). Everything in it
 * is independent of the organisation; everything below it (rail, drawer, workspace) is the
 * organisation context. Left to right:
 *   leading     the drawer toggle on tablets and phones
 *   scope       the organisation switcher (OrgSwitcher): the door between the two contexts,
 *               always visible, first after the logo. The breadcrumb continues from it.
 *   breadcrumb  the universal breadcrumb, always at the same x (R6.4)
 *   search      SearchTrigger (opens the command palette; global, across organisations)
 *   actions     application-level buttons: the inspector toggle and the product's settings
 *               gear (TopBarSettingsButton)
 *   account     AccountButton (avatar with the notifications badge, name, email; avatar
 *               only when narrow). Its menu holds Notifications, "Profile and
 *               preferences…" and Sign out. There is no separate bell.
 *   trailing    the far right: the assistant for the current context (InspectorToggle with
 *               the product's AI mark), pressed while its pane is open
 *
 * The bar is an inline-size container, so it adapts to the width it is given. What gives
 * way, in order (R5.2): the search field shrinks to its minimum, then folds to an icon square;
 * then the breadcrumb compacts; the account folds to its avatar under 84rem; the
 * organisation folds to its avatar and short code only under 70rem. The first two need the
 * breadcrumb's natural width, so the bar measures them (useBarFit); the rest are container
 * queries.
 *
 * Under 34rem (phones) the bar folds (data-fold): the module switch becomes its menu button
 * ("RMM ▾", SegmentedCollapseContext), the breadcrumb shows only the current place and its
 * popup drops from the bar holding the module switch, the organisation and the trail
 * (BreadcrumbFoldContext), the organisation's own trigger leaves the bar, and the search is a
 * ghost icon. A running timer keeps its place; the module button then leaves for the trail.
 */
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import {
  IconChevronDown,
  IconChevronRight,
  IconInspector,
  IconMoon,
  IconSearch,
  IconSettings,
  IconSidebar,
  IconSun,
} from "../icons/generated/icons.js";
import { useAppearance } from "../lib/appearance/use-appearance.js";
import { cx } from "../lib/cx.js";
import { Avatar } from "../ui/avatar/index.js";
import { CountBadge } from "../ui/badge/index.js";
import {
  BreadcrumbFoldContext,
  type BreadcrumbFold,
} from "../ui/breadcrumb/index.js";
import { Button } from "../ui/button/index.js";
import {
  Kbd,
  matchesShortcut,
  useAriaShortcut,
  usePlatform,
} from "../ui/kbd/index.js";
import { SegmentedCollapseContext } from "../ui/segmented/index.js";
import { useOptionalShell } from "./app-shell.js";

export interface TopBarProps extends Omit<
  ComponentProps<"header">,
  "children"
> {
  /** Before the scope: the product's module switch (a Segmented: RMM · PSA · CHAT). Folds to its menu on a phone. */
  module?: ReactNode;
  /**
   * The tenant scope: an OrgSwitcher. The breadcrumb follows it after a separator. On a phone
   * its trigger leaves the bar for the breadcrumb's trail: give the Breadcrumb a `scope` that
   * opens the switcher.
   */
  scope?: ReactNode;
  /** A Breadcrumb. On a phone it shows only the current place; give it a `header` (the module switch) and a `scope`. */
  breadcrumb?: ReactNode;
  /** Live state that appears only while it runs (a TimerChip), after the breadcrumb. */
  status?: ReactNode;
  /** Search definition or controlled search value. */
  search?: ReactNode;
  /** Supporting actions rendered in the action slot. */
  actions?: ReactNode;
  /** Account identity displayed by the component. */
  account?: ReactNode;
  /** The far right, after the account: the assistant toggle. */
  trailing?: ReactNode;
}

/** A responsive application header combining scope, breadcrumb, search, status, account and host-defined actions. */
export function TopBar({
  module,
  scope,
  breadcrumb,
  status,
  search,
  actions,
  account,
  trailing,
  className,
  style,
  ...rest
}: TopBarProps) {
  const ref = useRef<HTMLElement>(null);
  const fit = useBarFit(ref);
  const fold = useMemo<BreadcrumbFold>(
    () => ({ folded: fit.fold, anchor: ref }),
    [fit.fold],
  );
  return (
    <header
      ref={ref}
      {...rest}
      className={cx("fa-shell-topbar", className)}
      data-search={fit.search}
      data-fold={fit.fold ? "" : undefined}
      data-crumbs={breadcrumb ? "" : undefined}
      style={{
        ...style,
        ...(fit.crumbs
          ? ({ "--_crumbs-need": `${fit.crumbs}px` } as CSSProperties)
          : null),
      }}
    >
      <DrawerToggle />
      {module ? (
        <div className="fa-shell-topbar-module">
          <SegmentedCollapseContext value={fit.fold ? "menu" : undefined}>
            {module}
          </SegmentedCollapseContext>
        </div>
      ) : null}
      {scope ? (
        <div className="fa-shell-topbar-scope">
          {scope}
          {breadcrumb ? (
            <IconChevronRight className="fa-shell-topbar-sep" aria-hidden />
          ) : null}
        </div>
      ) : null}
      <div className="fa-shell-topbar-crumbs">
        <BreadcrumbFoldContext value={fold}>{breadcrumb}</BreadcrumbFoldContext>
      </div>
      {status ? <div className="fa-shell-topbar-status">{status}</div> : null}
      {search ? <div className="fa-shell-topbar-search">{search}</div> : null}
      {actions ? (
        <div className="fa-shell-topbar-actions">{actions}</div>
      ) : null}
      {account}
      {trailing ? (
        <div className="fa-shell-topbar-trailing">{trailing}</div>
      ) : null}
    </header>
  );
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** A length from CSS ("14rem", "224px") in pixels. */
function cssPixels(value: string, element: Element): number {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return 0;
  if (value.trim().endsWith("rem"))
    return (
      number *
      Number.parseFloat(
        getComputedStyle(element.ownerDocument.documentElement).fontSize,
      )
    );
  return number;
}

/** The bar's width under which it folds for a phone (R5.2), as the container queries in top-bar.css. */
const FOLD_REM = 34;

interface BarFit {
  /** Search definition or controlled search value. */
  search: "field" | "icon";
  crumbs: number;
  /** Under 34rem: the module switch, the organisation and the trail fold into the breadcrumb. */
  fold: boolean;
}

/**
 * How the bar fits (R5.2 collapse order).
 *
 * The search gives way before the breadcrumb: it stays a field only while everything else,
 * the breadcrumb at its natural width (its data-natural-width) and the search at its minimum
 * (--_search-min) fit the bar. Otherwise it folds to an icon and the breadcrumb takes the
 * room. While it is a field the breadcrumb's natural width is its flex basis, so the field
 * shrinks first.
 *
 * Under 34rem of its own width the bar folds (the same threshold as its container queries,
 * measured here because the module switch and the breadcrumb render differently, not only
 * look different).
 */
function useBarFit(ref: RefObject<HTMLElement | null>): BarFit {
  const [fit, setFit] = useState<BarFit>({
    search: "field",
    crumbs: 0,
    fold: false,
  });
  useIsomorphicLayoutEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const crumbsSlot = bar.querySelector<HTMLElement>(
        ":scope > .fa-shell-topbar-crumbs",
      );
      const searchSlot = bar.querySelector<HTMLElement>(
        ":scope > .fa-shell-topbar-search",
      );
      const natural = Number(
        crumbsSlot
          ?.querySelector("[data-natural-width]")
          ?.getAttribute("data-natural-width") ?? 0,
      );
      const style = getComputedStyle(bar);
      const inner =
        bar.clientWidth -
        (Number.parseFloat(style.paddingInlineStart) || 0) -
        (Number.parseFloat(style.paddingInlineEnd) || 0);
      const fold = inner < cssPixels(`${FOLD_REM}rem`, bar);
      const update = (search: BarFit["search"]) =>
        setFit((current) =>
          current.search === search &&
          current.crumbs === natural &&
          current.fold === fold
            ? current
            : { search, crumbs: natural, fold },
        );
      if (!searchSlot) return update("field");
      const gap = Number.parseFloat(style.columnGap) || 0;
      const shown = Array.from(bar.children).filter(
        (child) =>
          !["none", "contents"].includes(getComputedStyle(child).display),
      );
      let others = 0;
      for (const child of shown)
        if (child !== crumbsSlot && child !== searchSlot)
          others += child.getBoundingClientRect().width;
      const searchMin = cssPixels(
        getComputedStyle(searchSlot).getPropertyValue("--_search-min"),
        bar,
      );
      const need =
        others + gap * Math.max(0, shown.length - 1) + natural + searchMin;
      update(need <= inner - 1 ? "field" : "icon");
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule);
    const observeChildren = () => {
      resize.disconnect();
      resize.observe(bar);
      for (const child of Array.from(bar.children)) resize.observe(child);
    };
    observeChildren();
    // A slot appearing (the timer chip) or the breadcrumb re-measuring its trail.
    const mutations = new MutationObserver((records) => {
      if (
        records.some(
          (record) => record.type === "childList" && record.target === bar,
        )
      )
        observeChildren();
      schedule();
    });
    mutations.observe(bar, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-natural-width"],
    });
    measure();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
    };
  }, [ref]);
  return fit;
}

/**
 * Opens the section drawer sheet where the drawer is not docked (tablets, phones). A section
 * without navigation has no drawer (R5.2): the toggle stays in its place, disabled with the
 * reason, so moving between sections never shifts the bar.
 */
function DrawerToggle() {
  const shell = useOptionalShell();
  if (!shell) return null;
  return (
    <Button
      className="fa-shell-topbar-drawer-toggle"
      variant="ghost"
      icon={<IconSidebar />}
      aria-label="Section navigation"
      aria-expanded={
        shell.desktop || !shell.hasDrawer ? undefined : shell.drawerOpen
      }
      disabledReason={
        shell.hasDrawer ? undefined : "This section has no navigation"
      }
      onClick={() => shell.setDrawerOpen(true)}
    />
  );
}

export interface SearchTriggerProps extends Omit<
  ComponentProps<"button">,
  "children"
> {
  placeholder?: string;
  /** Opens from anywhere (R11.5). Default mod+k. */
  shortcut?: string;
  /** Called when open occurs. The callback type specifies its arguments. */
  onOpen: () => void;
}

/** The command search field. A button that looks like a field: it opens the palette. */
export function SearchTrigger({
  placeholder = "Search…",
  shortcut = "mod+k",
  onOpen,
  className,
  ...rest
}: SearchTriggerProps) {
  const platform = usePlatform();
  const aria = useAriaShortcut(shortcut);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // A command palette host that owns the shortcut has already handled it.
      if (event.defaultPrevented || !matchesShortcut(event, shortcut, platform))
        return;
      event.preventDefault();
      onOpen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut, platform, onOpen]);
  return (
    <button
      type="button"
      {...rest}
      className={cx("fa-control fa-shell-search", className)}
      aria-label="Search"
      aria-keyshortcuts={aria}
      onClick={onOpen}
    >
      <IconSearch />
      <span className="fa-shell-search-placeholder">{placeholder}</span>
      <Kbd className="fa-shell-search-kbd" keys={shortcut} size="sm" />
    </button>
  );
}

/**
 * The product's settings (Glass UX settings: the workspace dialog), an application-level gear.
 * Spreads props on the button, so it can open a dialog or be a link.
 */
export function TopBarSettingsButton({
  label,
  ...rest
}: Omit<ComponentProps<typeof Button>, "icon" | "aria-label" | "children"> & {
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      icon={<IconSettings />}
      aria-label={label}
      {...rest}
    />
  );
}

/** Quick light/dark switch, for products that want it in the bar. Glass UX keeps it in the account menu. */
export function ThemeToggle() {
  const { resolvedMode, update } = useAppearance();
  const dark = resolvedMode === "dark";
  return (
    <Button
      variant="ghost"
      icon={dark ? <IconSun /> : <IconMoon />}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => update({ mode: dark ? "light" : "dark" })}
    />
  );
}

export interface InspectorToggleProps {
  /** The pane's mark (the product's AI mark). Default: the inspector glyph. */
  icon?: ReactNode;
  /** Its name and tooltip: "Assistant here". Default: "Show inspector" / "Hide inspector". */
  label?: string;
  /** Toggles from anywhere ("mod+."); shown in the tooltip. */
  shortcut?: string;
}

/**
 * Shows or hides the inspector pane: in Glass UX, the assistant for the current context. It is
 * pressed while the pane is open. Renders nothing when the page has no inspector.
 */
export function InspectorToggle({
  icon,
  label,
  shortcut,
}: InspectorToggleProps) {
  const shell = useOptionalShell();
  const platform = usePlatform();
  const open = shell?.inspectorOpen ?? false;
  const available = shell?.inspectorAvailable ?? false;
  const setOpen = shell?.setInspectorOpen;
  useEffect(() => {
    if (!shortcut || !available || !setOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !matchesShortcut(event, shortcut, platform))
        return;
      event.preventDefault();
      setOpen(!open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut, platform, available, open, setOpen]);
  if (!shell?.inspectorAvailable) return null;
  return (
    <Button
      className="fa-shell-topbar-inspector-toggle"
      variant={open ? "soft" : "ghost"}
      icon={icon ?? <IconInspector />}
      aria-label={label ?? (open ? "Hide inspector" : "Show inspector")}
      aria-pressed={open}
      shortcut={shortcut}
      onClick={() => shell.setInspectorOpen(!open)}
    />
  );
}

export interface AccountButtonProps extends Omit<
  ComponentProps<"button">,
  "children"
> {
  /** Display name for the signed-in account; also used for its accessible name and avatar fallback. */
  name: string;
  /** Optional second line beneath the name. Omit when the account has no public email address. */
  email?: string;
  /** Profile image URL; an initials fallback is used when it is absent. */
  avatarSrc?: string;
  /** Unread notifications: a count on the avatar's corner (R5.2: the avatar carries them). */
  unread?: number;
}

/**
 * The signed-in user account: avatar, display name, optional email and notification count.
 * Use as a Menu trigger for host-owned profile, preferences and sign-out actions:
 * `<Menu.Trigger render={<AccountButton … />} />`. Native button props and refs are preserved.
 */
export function AccountButton({
  name,
  email,
  avatarSrc,
  unread = 0,
  className,
  ...rest
}: AccountButtonProps) {
  const unreadText =
    unread > 0
      ? `, ${unread} unread ${unread === 1 ? "notification" : "notifications"}`
      : "";
  return (
    <button
      type="button"
      aria-label={`Account: ${name}${unreadText}`}
      {...rest}
      className={cx("fa-shell-account fa-pressable", className)}
    >
      <span className="fa-shell-account-face">
        <Avatar name={name} src={avatarSrc} size="md" decorative />
        {unread > 0 ? (
          <CountBadge
            className="fa-shell-account-badge"
            value={unread}
            max={99}
            tone="accent"
            overlay
            aria-hidden
          />
        ) : null}
      </span>
      <span className="fa-shell-account-text">
        <TruncatedText className="fa-shell-account-name">{name}</TruncatedText>
        {email ? <TruncatedText className="fa-shell-account-email">{email}</TruncatedText> : null}
      </span>
      <IconChevronDown className="fa-shell-account-chevron" />
    </button>
  );
}

/** "0:42", "12:05", "1:02:03": minutes and seconds under an hour, then hours. */
export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

export interface TimerChipProps extends Omit<
  ComponentProps<"button">,
  "children"
> {
  /** When the timer started (epoch ms). */
  startedAt: number;
  /** What it runs against: "#4821". */
  label: string;
  /** Accessible noun: "Timer on ticket #4821". */
  name?: string;
}

/**
 * A running timer in the top bar: "0:42 · #4821", shown only while it runs (R5.2). It ticks
 * every second in tabular figures inside a reserved width, so nothing beside it moves; it
 * hands over to an hours width only once, at the first hour. Click it to open what it runs
 * against.
 */
export function TimerChip({
  startedAt,
  label,
  name,
  className,
  ...rest
}: TimerChipProps) {
  // Only rendered on the client while a timer runs, so the clock is never server-rendered.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const elapsed = now - startedAt;
  const text = formatElapsed(elapsed);
  return (
    <button
      type="button"
      {...rest}
      className={cx("fa-shell-timer fa-pressable", className)}
      aria-label={`${name ?? `Timer on ${label}`}, running for ${text}`}
      data-hours={elapsed >= 3_600_000 ? "" : undefined}
    >
      <ToneDot tone="data" marker="pulse" />
      <span className="fa-shell-timer-time" data-numeric data-timer-time="">
        {text}
      </span>
      <span className="fa-shell-timer-ticket" data-timer-ticket="">
        · {label}
      </span>
    </button>
  );
}
